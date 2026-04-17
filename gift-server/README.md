# Gift Server (Raspberry Pi)

Lightweight Express server that controls two servo motors via GPIO to open a wedding gift box.

## Setup on Raspberry Pi

```bash
cd gift-server
npm install
```

> `pigpio` requires root access on the Pi. Run with `sudo` or configure permissions.

## Running

```bash
sudo node index.js
```

Or with environment variables:

```bash
PORT=3001 GPIO_PIN_1=18 GPIO_PIN_2=23 sudo -E node index.js
```

## API

| Method | Path      | Description                          |
|--------|-----------|--------------------------------------|
| POST   | `/open`   | Trigger the gift opening sequence    |
| GET    | `/health` | Health check (GPIO status, busy)     |

## GPIO Wiring

| Servo   | Default GPIO Pin |
|---------|-----------------|
| Servo 1 | GPIO 18         |
| Servo 2 | GPIO 23         |

Connect servo signal wires to the GPIO pins above. Power the servos from a separate 5V supply (not from the Pi's 5V header for reliability).

## Environment Variables

| Variable     | Default | Description         |
|-------------|---------|---------------------|
| `PORT`      | `3001`  | Server listen port  |
| `GPIO_PIN_1`| `18`    | GPIO pin for servo 1|
| `GPIO_PIN_2`| `23`    | GPIO pin for servo 2|
