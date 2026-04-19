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
const GPIO_PIN_IR_SENSOR_WOMAN = parseInt(process.env.GPIO_PIN_IR_SENSOR_WOMAN || "24", 10);
const IR_SENSOR_POLL_MS = parseInt(process.env.IR_SENSOR_POLL_MS || "500", 10);

// Servo positions in microseconds (adjust per physical calibration)
const OPEN_POS_MAN = 2200;
const CLOSED_POS_MAN = 1300;
const OPEN_POS_MAN_2 = 2200;
const CLOSED_POS_MAN_2 = 1300;

const OPEN_POS_WOMAN = 2200;
const CLOSED_POS_WOMAN = 1300;
const OPEN_POS_WOMAN_2 = 2200;
const CLOSED_POS_WOMAN_2 = 1300;

const STEP_DELAY_MS = 20;
const PAUSE_MS = 2000;

// --- GPIO setup ---
let servoMan1;
let servoMan2;
let servoWoman1;
let servoWoman2;
let irSensorMan;
let irSensorWoman;

try {
  servoMan1 = new Gpio(GPIO_PIN_MAN, { mode: Gpio.OUTPUT });
  servoMan2 = new Gpio(GPIO_PIN_MAN_2, { mode: Gpio.OUTPUT });
  servoWoman1 = new Gpio(GPIO_PIN_WOMAN, { mode: Gpio.OUTPUT });
  servoWoman2 = new Gpio(GPIO_PIN_WOMAN_2, { mode: Gpio.OUTPUT });
  irSensorMan = new Gpio(GPIO_PIN_IR_SENSOR_MAN, { mode: Gpio.INPUT });
  irSensorWoman = new Gpio(GPIO_PIN_IR_SENSOR_WOMAN, { mode: Gpio.INPUT });

  servoMan1.servoWrite(CLOSED_POS_MAN);
  servoMan2.servoWrite(CLOSED_POS_MAN_2);
  servoWoman1.servoWrite(CLOSED_POS_WOMAN);
  servoWoman2.servoWrite(CLOSED_POS_WOMAN_2);
  console.log(
    `Servos initialized on GPIO man=${GPIO_PIN_MAN}, man2=${GPIO_PIN_MAN_2}, woman=${GPIO_PIN_WOMAN},  woman2=${GPIO_PIN_WOMAN_2}`,
  );
} catch (err) {
  console.warn("pigpio not available");
  console.warn(err.message);
  process.exit(1);
}

// --- Helpers ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let busy = false;

// gender: 'man' | 'woman'
async function openGiftSequence(gender) {
  if (busy) {
    throw new Error("Valaki ajándékadása már fut, kérlek próbáld újra utána.");
  }

  const isMan = gender === "man";
  const irSensor = isMan ? irSensorMan : irSensorWoman;
  const sensorValue = irSensor.digitalRead();
  if (sensorValue === 1) {
    throw new Error("Nincs elég ajándék a gépben, valaki már igyekszik segíteni.");
  }

  busy = true;
  console.log(`Starting gift sequence for: ${gender}`);

  const servoFirst = isMan ? servoMan1 : servoWoman1;
  const servoSecond = isMan ? servoMan2 : servoWoman2;
  const openPosFirst = isMan ? OPEN_POS_MAN : OPEN_POS_WOMAN;
  const closedPosFirst = isMan ? CLOSED_POS_MAN : CLOSED_POS_WOMAN;
  const openPosSecond = isMan ? OPEN_POS_MAN_2 : OPEN_POS_WOMAN_2;
  const closedPosSecond = isMan ? CLOSED_POS_MAN_2 : CLOSED_POS_WOMAN_2;

  try {
    // Step 1: Open the gender-specific (1st gift) servo, then close it
    servoFirst.servoWrite(openPosFirst);
    await sleep(PAUSE_MS);
    servoFirst.servoWrite(closedPosFirst);
    await sleep(PAUSE_MS);

    // Step 2: Open the gender-specific (2nd gift) servo, then close it
    servoSecond.servoWrite(openPosSecond);
    await sleep(PAUSE_MS);
    servoSecond.servoWrite(closedPosSecond);
    await sleep(PAUSE_MS);

    console.log("Gift sequence complete");
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
      const { id, gender } = msg;
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
        await openGiftSequence(gender);
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
  if (servoMan1) servoMan1.servoWrite(CLOSED_POS_MAN);
  if (servoMan2) servoMan2.servoWrite(CLOSED_POS_MAN_2);
  if (servoWoman1) servoWoman1.servoWrite(CLOSED_POS_WOMAN);
  if (servoWoman2) servoWoman2.servoWrite(CLOSED_POS_WOMAN_2);
  if (ws) ws.close();
  process.exit();
});

// (async () => {
//   while (true) {
// servoMan1.servoWrite(OPEN_POS_MAN);
// await sleep(1000)
// servoMan1.servoWrite(CLOSED_POS_MAN);
// await sleep(1000)

// servoMan2.servoWrite(OPEN_POS_MAN_2);
// await sleep(1000)
// servoMan2.servoWrite(CLOSED_POS_MAN_2);
// await sleep(1000)

// servoWoman1.servoWrite(OPEN_POS_WOMAN);
// await sleep(2000)
// servoWoman1.servoWrite(CLOSED_POS_WOMAN);
// await sleep(5000)

// servoWoman2.servoWrite(OPEN_POS_WOMAN_2);
// await sleep(2000)
// servoWoman2.servoWrite(CLOSED_POS_WOMAN_2);
// await sleep(5000)
//   }
// })();

// // --- IR sensor polling ---
// setInterval(() => {
//   if (!irSensor) return;
//   const value = irSensor.digitalRead();
//   console.log(`IR sensor (TCRT5000) GPIO ${GPIO_PIN_IR_SENSOR}: ${value} (${value === 0 ? 'detected' : 'clear'})`);
// }, IR_SENSOR_POLL_MS);
