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
const GPIO_PIN_MAN = parseInt(process.env.GPIO_PIN_MAN || "23", 10);
const GPIO_PIN_WOMAN = parseInt(process.env.GPIO_PIN_WOMAN || "24", 10);
const GPIO_PIN_SHARED = parseInt(process.env.GPIO_PIN_SHARED || "25", 10);

// Servo positions in microseconds (adjust per physical calibration)
const OPEN_POS_MAN = 2200;
const CLOSED_POS_MAN = 1300;
const OPEN_POS_WOMAN = 2200;
const CLOSED_POS_WOMAN = 1300;
const OPEN_POS_SHARED = 2200;
const CLOSED_POS_SHARED = 1300;

const STEP_DELAY_MS = 20;
const PAUSE_MS = 3000;

// --- GPIO setup ---
let servoMan;
let servoWoman;
let servoShared;

try {
  servoMan = new Gpio(GPIO_PIN_MAN, { mode: Gpio.OUTPUT });
  servoWoman = new Gpio(GPIO_PIN_WOMAN, { mode: Gpio.OUTPUT });
  servoShared = new Gpio(GPIO_PIN_SHARED, { mode: Gpio.OUTPUT });
  servoMan.servoWrite(CLOSED_POS_MAN);
  servoWoman.servoWrite(CLOSED_POS_WOMAN);
  servoShared.servoWrite(CLOSED_POS_SHARED);
  console.log(
    `Servos initialized on GPIO man=${GPIO_PIN_MAN}, woman=${GPIO_PIN_WOMAN}, shared=${GPIO_PIN_SHARED}`,
  );
} catch (err) {
  console.warn("pigpio not available – running in simulation mode");
  console.warn(err.message);
  servoMan = null;
  servoWoman = null;
  servoShared = null;
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
  const servoFirst = isMan ? servoMan : servoWoman;
  const openPosFirst = isMan ? OPEN_POS_MAN : OPEN_POS_WOMAN;
  const closedPosFirst = isMan ? CLOSED_POS_MAN : CLOSED_POS_WOMAN;

  try {
    // Step 1: Open the gender-specific (1st gift) servo, then close it
    await sweep(servoFirst, closedPosFirst, openPosFirst);
    await sleep(PAUSE_MS);
    await sweep(servoFirst, openPosFirst, closedPosFirst);
    await sleep(PAUSE_MS);

    // Step 2: Open the shared (2nd gift) servo, then close it
    await sweep(servoShared, CLOSED_POS_SHARED, OPEN_POS_SHARED);
    await sleep(PAUSE_MS);
    await sweep(servoShared, OPEN_POS_SHARED, CLOSED_POS_SHARED);
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
    gpio: servoMan !== null,
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
  if (servoMan) servoMan.servoWrite(0);
  if (servoWoman) servoWoman.servoWrite(0);
  if (servoShared) servoShared.servoWrite(0);
  if (ws) ws.close();
  process.exit();
});
