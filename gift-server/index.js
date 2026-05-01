require("dotenv").config();
const WebSocket = require("ws");
const Gpio = require('pigpio').Gpio;

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const MAIN_SERVER_WS_URL = process.env.MAIN_SERVER_WS_URL;
const CHECKIN_INTERVAL_MS = 10 * 1000;
const RECONNECT_DELAY_MS = 5 * 1000;

if (!MAIN_SERVER_WS_URL) {
  console.error("Error: MAIN_SERVER_WS_URL environment variable is not set");
  process.exit(1);
}

// GPIO pins for the three servo motors
const GPIO_PIN_MAN = parseInt(process.env.GPIO_PIN_MAN || "4", 10);
const GPIO_PIN_MAN_2 = parseInt(process.env.GPIO_PIN_MAN_2 || "24", 10); // 24 ok
const GPIO_PIN_WOMAN = parseInt(process.env.GPIO_PIN_WOMAN || "17", 10);
const GPIO_PIN_WOMAN_2 = parseInt(process.env.GPIO_PIN_WOMAN_2 || "18", 10);
const GPIO_PIN_IR_SENSOR_MAN = parseInt(process.env.GPIO_PIN_IR_SENSOR_MAN || "23", 10);
const GPIO_PIN_IR_SENSOR_WOMAN = parseInt(process.env.GPIO_PIN_IR_SENSOR_WOMAN || "25", 10);
const IR_SENSOR_POLL_MS = parseInt(process.env.IR_SENSOR_POLL_MS || "500", 10);

// Standard positional servo endpoints in microseconds.
const OPEN_POS_MAN = parseInt(process.env.OPEN_POS_MAN || "1300", 10);
const CLOSED_POS_MAN = parseInt(process.env.CLOSED_POS_MAN || "2200", 10);
const OPEN_POS_WOMAN = parseInt(process.env.OPEN_POS_WOMAN || "2200", 10);
const CLOSED_POS_WOMAN = parseInt(process.env.CLOSED_POS_WOMAN || "1300", 10);

// Continuous-rotation servos use direction pulses around a neutral stop pulse.
const CR_NEUTRAL_US = parseInt(process.env.CR_NEUTRAL_US || "1500", 10);
const CR_MAN_2_OPEN_US = parseInt(process.env.CR_MAN_2_OPEN_US || "1300", 10);
const CR_MAN_2_CLOSE_US = parseInt(process.env.CR_MAN_2_CLOSE_US || "1700", 10);
const CR_WOMAN_2_OPEN_US = parseInt(process.env.CR_WOMAN_2_OPEN_US || "1300", 10);
const CR_WOMAN_2_CLOSE_US = parseInt(process.env.CR_WOMAN_2_CLOSE_US || "1700", 10);

const OPEN_RUN_MS = 800;
const CLOSE_RUN_MS = 800;

const SERVO_SETTLE_MS = parseInt(process.env.SERVO_SETTLE_MS || "700", 10);
const PAUSE_MS = parseInt(process.env.PAUSE_MS || "2000", 10);

function validateUniquePins() {
  const configuredPins = [
    ["GPIO_PIN_MAN", GPIO_PIN_MAN],
    ["GPIO_PIN_MAN_2", GPIO_PIN_MAN_2],
    ["GPIO_PIN_WOMAN", GPIO_PIN_WOMAN],
    ["GPIO_PIN_WOMAN_2", GPIO_PIN_WOMAN_2],
    ["GPIO_PIN_IR_SENSOR_MAN", GPIO_PIN_IR_SENSOR_MAN],
    ["GPIO_PIN_IR_SENSOR_WOMAN", GPIO_PIN_IR_SENSOR_WOMAN],
  ];
  const usedPins = new Map();

  for (const [name, pin] of configuredPins) {
    const existing = usedPins.get(pin);
    if (existing) {
      throw new Error(`GPIO pin conflict: ${name} and ${existing} are both set to ${pin}`);
    }
    usedPins.set(pin, name);
  }
}

function stopServo(servo) {
  servo.servoWrite(0);
}

// --- Helpers ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function moveServo(servo, positionUs) {
  servo.servoWrite(positionUs);
  await sleep(SERVO_SETTLE_MS);
  stopServo(servo);
}

async function runContinuousServo(servo, pulseWidth, durationMs) {
  servo.servoWrite(pulseWidth);
  await sleep(durationMs);
  servo.servoWrite(CR_NEUTRAL_US);
  await sleep(100);
  stopServo(servo);
}

function stopAllServos() {
  if (servoMan1) stopServo(servoMan1);
  if (servoMan2) stopServo(servoMan2);
  if (servoWoman1) stopServo(servoWoman1);
  if (servoWoman2) stopServo(servoWoman2);
}

// --- GPIO setup ---
let servoMan1;
let servoMan2;
let servoWoman1;
let servoWoman2;
let irSensorMan;
let irSensorWoman;

try {
  validateUniquePins();

  servoMan1 = new Gpio(GPIO_PIN_MAN, { mode: Gpio.OUTPUT });
  servoMan2 = new Gpio(GPIO_PIN_MAN_2, { mode: Gpio.OUTPUT });
  servoWoman1 = new Gpio(GPIO_PIN_WOMAN, { mode: Gpio.OUTPUT });
  servoWoman2 = new Gpio(GPIO_PIN_WOMAN_2, { mode: Gpio.OUTPUT });
  irSensorMan = new Gpio(GPIO_PIN_IR_SENSOR_MAN, { mode: Gpio.INPUT });
  irSensorWoman = new Gpio(GPIO_PIN_IR_SENSOR_WOMAN, { mode: Gpio.INPUT });

  servoMan1.servoWrite(CLOSED_POS_MAN);
  servoMan2.servoWrite(CR_NEUTRAL_US);
  runContinuousServo(servoMan2, CR_MAN_2_CLOSE_US, 500);
  servoWoman1.servoWrite(CLOSED_POS_WOMAN);
  servoWoman2.servoWrite(CR_NEUTRAL_US);
  console.log(
    `Servos initialized on GPIO man=${GPIO_PIN_MAN}, man2=${GPIO_PIN_MAN_2}, woman=${GPIO_PIN_WOMAN},  woman2=${GPIO_PIN_WOMAN_2}`,
  );
  setTimeout(stopAllServos, SERVO_SETTLE_MS);
} catch (err) {
  console.warn("pigpio not available");
  console.warn(err.message);
  process.exit(1);
}

let busy = false;

// gender: 'man' | 'woman'
async function openGiftSequence(gender, force = false) {
  if (busy) {
    throw new Error("Valaki ajándékadása már fut, kérlek próbáld újra utána.");
  }

  const isMan = gender === "man";
  const irSensor = isMan ? irSensorMan : irSensorWoman;
  const sensorValue = irSensor.digitalRead();
  if (!force && sensorValue === 1) {
    throw new Error("Nincs elég ajándék a gépben, valaki már igyekszik segíteni.");
  }

  busy = true;
  console.log(`Starting gift sequence for: ${gender}`);

  const servoFirst = isMan ? servoMan1 : servoWoman1;
  const servoSecond = isMan ? servoMan2 : servoWoman2;
  const openPosFirst = isMan ? OPEN_POS_MAN : OPEN_POS_WOMAN;
  const closedPosFirst = isMan ? CLOSED_POS_MAN : CLOSED_POS_WOMAN;
  const openPulseSecond = isMan ? CR_MAN_2_OPEN_US : CR_WOMAN_2_OPEN_US;
  const closePulseSecond = isMan ? CR_MAN_2_CLOSE_US : CR_WOMAN_2_CLOSE_US;

  try {
    await runContinuousServo(servoSecond, openPulseSecond, OPEN_RUN_MS);
    await sleep(PAUSE_MS);
    await runContinuousServo(servoSecond, closePulseSecond, CLOSE_RUN_MS);
    await sleep(PAUSE_MS);
    
    await moveServo(servoFirst, openPosFirst);
    await sleep(PAUSE_MS);
    await moveServo(servoFirst, closedPosFirst);
    await sleep(PAUSE_MS);

    console.log("Gift sequence complete");

    // Check if gift was actually dispensed
    await sleep(500); // Wait a bit for gift to settle
    const finalSensorValue = irSensor.digitalRead();
    if (finalSensorValue === 1) {
      // No gift detected after dispensing
      send({
        type: "no_gift_detected",
        gender,
        message: `No gift detected in ${gender} dispenser after sequence`,
      });
    }
  } finally {
    busy = false;
  }
  return true;
}

// --- WebSocket client: connect to main server ---
let ws = null;
let checkinInterval = null;

function connectToMainServer() {
  console.log(`Connecting to main server at ${MAIN_SERVER_WS_URL}`);
  ws = new WebSocket(MAIN_SERVER_WS_URL);

  ws.on("open", () => {
    console.log("WebSocket connected to main server");
    sendCheckin();
    checkinInterval = setInterval(sendCheckin, CHECKIN_INTERVAL_MS);
  });

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      console.warn("Received invalid JSON from main server");
      return;
    }

    if (msg.type === "open") {
      const { id, gender, force } = msg;
      if (gender !== "man" && gender !== "woman") {
        send({
          type: "open_result",
          id,
          status: "error",
          message: "Invalid gender",
        });
        return;
      }

      try {
        await openGiftSequence(gender, Boolean(force));
      } catch (error) {
        send({
          type: "open_result",
          id,
          status: "error",
          message: error.message,
        });
        return;
      }

      send({ type: "open_result", id, status: "done", gender });
    }
  });

  ws.on("close", () => {
    console.warn("WebSocket disconnected, reconnecting in 5s...");
    clearInterval(checkinInterval);
    checkinInterval = null;
    setTimeout(connectToMainServer, RECONNECT_DELAY_MS);
  });

  ws.on("error", (err) => {
    console.error(`WebSocket error: ${err.message}`);
    // 'close' event fires after error, triggering reconnect
  });
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  } 
}

function sendCheckin() {
  send({ type: "checkin" });
}

connectToMainServer();

// Graceful shutdown
process.on("SIGINT", () => {
  stopAllServos();
  if (ws) ws.close();
  process.exit();
});

// // --- IR sensor polling ---
// setInterval(() => {
//   if (!irSensor) return;
//   const value = irSensor.digitalRead();
//   console.log(`IR sensor (TCRT5000) GPIO ${GPIO_PIN_IR_SENSOR}: ${value} (${value === 0 ? 'detected' : 'clear'})`);
// }, IR_SENSOR_POLL_MS);

// (async () => {
//   while (true) {
//     await runContinuousServo(servoMan2, CR_MAN_2_OPEN_US, OPEN_RUN_MS);
//     await sleep(2000);
//     await runContinuousServo(servoMan2, CR_MAN_2_CLOSE_US, CLOSE_RUN_MS);
//     await sleep(2000);

//     await moveServo(servoMan1, OPEN_POS_MAN);
//     await sleep(2000);
//     await moveServo(servoMan1, CLOSED_POS_MAN);
//     await sleep(2000);

//     await runContinuousServo(servoWoman2, CR_WOMAN_2_OPEN_US, OPEN_RUN_MS);
//     await sleep(2000);
//     await runContinuousServo(servoWoman2, CR_WOMAN_2_CLOSE_US, CLOSE_RUN_MS);
//     await sleep(2000);

//     await moveServo(servoWoman1, OPEN_POS_WOMAN);
//     await sleep(2000);
//     await moveServo(servoWoman1, CLOSED_POS_WOMAN);
//     await sleep(2000);
//   }
// })();