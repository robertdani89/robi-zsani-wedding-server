require("dotenv").config();
const express = require("express");
const WebSocket = require("ws");
const app = express();
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
const GPIO_PIN_MAN = parseInt(process.env.GPIO_PIN_MAN || "22", 10);
const GPIO_PIN_MAN_2 = parseInt(process.env.GPIO_PIN_MAN_2 || "23", 10);
const GPIO_PIN_WOMAN = parseInt(process.env.GPIO_PIN_WOMAN || "24", 10);
const GPIO_PIN_WOMAN_2 = parseInt(process.env.GPIO_PIN_WOMAN_2 || "25", 10);

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
const PAUSE_MS = 3000;

// --- GPIO setup ---
let servoMan1;
let servoWoman1;
let servoMan2;
let servoWoman2;
try {
  servoMan1 = new Gpio(GPIO_PIN_MAN, { mode: Gpio.OUTPUT });
  servoMan2 = new Gpio(GPIO_PIN_MAN_2, { mode: Gpio.OUTPUT });
  servoWoman1 = new Gpio(GPIO_PIN_WOMAN, { mode: Gpio.OUTPUT });
  servoWoman2 = new Gpio(GPIO_PIN_WOMAN_2, { mode: Gpio.OUTPUT });

  servoMan1.servoWrite(CLOSED_POS_MAN);
  servoMan2.servoWrite(CLOSED_POS_MAN_2);
  servoWoman1.servoWrite(CLOSED_POS_WOMAN);
  servoWoman2.servoWrite(CLOSED_POS_WOMAN_2);
  console.log(
    `Servos initialized on GPIO man=${GPIO_PIN_MAN}, man2=${GPIO_PIN_MAN_2}, woman=${GPIO_PIN_WOMAN},  woman2=${GPIO_PIN_WOMAN_2}`,
  );
} catch (err) {
  console.warn("pigpio not available – running in simulation mode");
  console.warn(err.message);
  servoMan1 = null;
  servoWoman1 = null;
  servoMan2 = null;
  servoWoman2 = null;
}

// --- Helpers ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sweep(servo, from, to) {
  if (!servo) return;

  const usStep = (to - from) / 15;
  let current = from;
  for (let i = 0; i <= 15; i++) {
    servo.servoWrite(Math.round(current));
    current += usStep;
    await sleep(STEP_DELAY_MS);
  }
  servo.servoWrite(to);
}

let busy = false;

// gender: 'man' | 'woman'
async function openGiftSequence(gender) {
  if (busy) {
    console.log("Gift sequence already running, ignoring request");
    return false;
  }
  busy = true;
  console.log(`Starting gift sequence for: ${gender}`);

  const isMan = gender === "man";
  const servoFirst = isMan ? servoMan1 : servoWoman1;
  const servoSecond = isMan ? servoMan2 : servoWoman2;
  const openPosFirst = isMan ? OPEN_POS_MAN : OPEN_POS_WOMAN;
  const closedPosFirst = isMan ? CLOSED_POS_MAN : CLOSED_POS_WOMAN;
  const openPosSecond = isMan ? OPEN_POS_MAN_2 : OPEN_POS_WOMAN_2;
  const closedPosSecond = isMan ? CLOSED_POS_MAN_2 : CLOSED_POS_WOMAN_2;

  try {
    // Step 1: Open the gender-specific (1st gift) servo, then close it
    await sweep(servoFirst, closedPosFirst, openPosFirst);
    await sleep(PAUSE_MS);
    await sweep(servoFirst, openPosFirst, closedPosFirst);
    await sleep(PAUSE_MS);

    // Step 2: Open the gender-specific (2nd gift) servo, then close it
    await sweep(servoSecond, closedPosSecond, openPosSecond);
    await sleep(PAUSE_MS);
    await sweep(servoSecond, openPosSecond, closedPosSecond);
    await sleep(PAUSE_MS);

    console.log("Gift sequence complete");
  } finally {
    busy = false;
  }
  return true;
}

// --- Routes ---
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    gpio: servoMan1 !== null,
    busy,
    wsConnected: ws !== null && ws.readyState === WebSocket.OPEN,
  });
});

// --- Start HTTP server (local diagnostics only) ---
app.listen(PORT, () => {
  console.log(`Gift server local HTTP running on port ${PORT}`);
});

// --- WebSocket client: connect to main server ---
let ws = null;
let checkinInterval = null;

function connectToMainServer() {
  console.log(`Connecting to main server at ${MAIN_SERVER_WS_URL}...`);
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
      const started = await openGiftSequence(gender);
      if (started) {
        send({ type: "open_result", id, status: "done", gender });
      } else {
        send({
          type: "open_result",
          id,
          status: "busy",
          message: "Gift sequence already in progress",
        });
      }
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

// Remove old HTTP /open route - commands now come through WebSocket

// Graceful shutdown
process.on("SIGINT", () => {
  if (servoMan1) servoMan1.servoWrite(0);
  if (servoWoman1) servoWoman1.servoWrite(0);
  if (servoMan2) servoMan2.servoWrite(0);
  if (servoWoman2) servoWoman2.servoWrite(0);
  if (ws) ws.close();
  process.exit();
});
