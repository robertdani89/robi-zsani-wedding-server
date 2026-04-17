const express = require('express');
const app = express();

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const GPIO_PIN_1 = parseInt(process.env.GPIO_PIN_1 || '18', 10);
const GPIO_PIN_2 = parseInt(process.env.GPIO_PIN_2 || '23', 10);

const OPEN_POS_1 = 2200;   // ~140° in microseconds
const CLOSED_POS_1 = 1300;  // ~80°
const OPEN_POS_2 = 2200;
const CLOSED_POS_2 = 1300;

const STEP_DELAY_MS = 15;
const PAUSE_MS = 3000;

// --- GPIO setup ---
let Gpio;
let servo1;
let servo2;

try {
  Gpio = require('pigpio').Gpio;
  servo1 = new Gpio(GPIO_PIN_1, { mode: Gpio.OUTPUT });
  servo2 = new Gpio(GPIO_PIN_2, { mode: Gpio.OUTPUT });
  servo1.servoWrite(CLOSED_POS_1);
  servo2.servoWrite(CLOSED_POS_2);
  console.log(`Servos initialized on GPIO ${GPIO_PIN_1} and ${GPIO_PIN_2}`);
} catch (err) {
  console.warn('pigpio not available – running in simulation mode');
  console.warn(err.message);
  servo1 = null;
  servo2 = null;
}

// --- Helpers ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sweep(servo, from, to) {
  if (!servo) return;
  const step = from < to ? 1 : -1;
  const range = Math.abs(to - from);
  const stepSize = (to - from) / range;
  // Map degree-style increments to microsecond increments (~15µs per degree)
  const usStep = stepSize * 15;
  let current = from;
  for (let i = 0; i <= range; i++) {
    servo.servoWrite(Math.round(current));
    current += usStep;
    await sleep(STEP_DELAY_MS);
  }
  servo.servoWrite(to);
}

let busy = false;

async function openGiftSequence() {
  if (busy) {
    console.log('Gift sequence already running, ignoring request');
    return false;
  }
  busy = true;
  console.log('Starting gift sequence...');

  try {
    // Open servo 1
    await sweep(servo1, CLOSED_POS_1, OPEN_POS_1);
    await sleep(PAUSE_MS);
    // Close servo 1
    await sweep(servo1, OPEN_POS_1, CLOSED_POS_1);
    await sleep(PAUSE_MS);

    // Open servo 2
    await sweep(servo2, CLOSED_POS_2, OPEN_POS_2);
    await sleep(PAUSE_MS);
    // Close servo 2
    await sweep(servo2, OPEN_POS_2, CLOSED_POS_2);
    await sleep(PAUSE_MS);

    console.log('Gift sequence complete');
  } finally {
    busy = false;
  }
  return true;
}

// --- Routes ---
app.post('/open', async (_req, res) => {
  const started = await openGiftSequence();
  if (started) {
    res.json({ status: 'done' });
  } else {
    res.status(409).json({ status: 'busy', message: 'Gift sequence already in progress' });
  }
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    gpio: servo1 !== null,
    busy,
  });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`Gift server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  if (servo1) servo1.servoWrite(0);
  if (servo2) servo2.servoWrite(0);
  process.exit();
});
