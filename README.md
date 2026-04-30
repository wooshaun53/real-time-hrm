# Pulse Monitor — Heart Rate Dashboard

A real-time heart rate dashboard that runs entirely in your browser. Connect your Bluetooth heart rate monitor, open the file, and watch your BPM and live graph update as you work.

---

## What You Need

- A Bluetooth heart rate monitor (Decathlon Dual HRR Belt, Kalenji, or any device that uses the standard **Bluetooth Low Energy Heart Rate Profile**)
- Google Chrome or Microsoft Edge on desktop
- The `heart-rate-dashboard.html` file from this project

That's it. No app installation, no account, no internet connection required once the file is open.

---

## Quick Start

1. **Turn on your heart rate monitor** and put it on
2. Make sure your PC's Bluetooth is turned on
3. Open `heart-rate-dashboard.html` in Chrome or Edge
4. Click **Connect Device**
5. A browser popup appears — select your device from the list and click Pair
6. Your BPM and graph will start updating within a few seconds

> **Do I need to pair the device in Windows Bluetooth settings first?**
> No. The browser handles the connection directly. You do not need to add the device in Windows Settings → Bluetooth. Just turn the monitor on and click Connect Device in the dashboard.

---

## How It Works — High Level

```
Your Heart → Heart Rate Monitor (worn on chest/wrist)
                    ↓  Bluetooth Low Energy (BLE)
              Your PC's Bluetooth Radio
                    ↓  Web Bluetooth API
              Chrome / Edge Browser
                    ↓  JavaScript
              Dashboard (BPM display + live graph)
```

Your heart rate monitor measures electrical signals from your heart and broadcasts BPM data continuously over Bluetooth. The dashboard listens for that data and updates the screen in real time — no server, no cloud, everything stays on your machine.

---

## How It Works — Technical Detail

### 1. The Heart Rate Monitor broadcasts over BLE

Your Decathlon monitor uses the **Bluetooth Low Energy (BLE) Heart Rate Profile** — a standardised protocol meaning any compliant app or device can read it, not just Decathlon's own app.

It continuously advertises a **GATT Service** with UUID `heart_rate`, which contains a **Characteristic** called `heart_rate_measurement`. This is where the raw BPM data lives.

### 2. The browser requests a connection

When you click Connect Device, Chrome opens a Bluetooth picker. Under the hood it runs:

```js
navigator.bluetooth.requestDevice({
  filters: [{ services: ['heart_rate'] }]
})
```

This scans for nearby BLE devices that advertise the `heart_rate` service. Your monitor should appear in the list within a few seconds of turning it on.

### 3. The dashboard subscribes to live data

Once you select your device, the dashboard:

1. Connects to the device's **GATT server**
2. Locates the `heart_rate` service
3. Locates the `heart_rate_measurement` characteristic inside it
4. Calls `startNotifications()` — this tells the monitor to push new data to the browser every time it has a reading (roughly once per second)

### 4. Raw bytes are parsed into BPM

Each notification delivers a small packet of raw bytes. The first byte is a **flags byte** that describes the format of the rest of the packet:

- If bit 0 of the flags byte is `0` → BPM is stored as a single byte (8-bit), max value 255
- If bit 0 of the flags byte is `1` → BPM is stored as two bytes (16-bit), for higher values

The dashboard reads the correct byte(s) and converts them to a plain integer — your BPM.

### 5. The dashboard updates in real time

Each new BPM reading:
- Updates the large BPM number and its colour (based on zone)
- Appends a `{ bpm, timestamp }` entry to an in-memory array
- Recalculates session max, min, and average
- Redraws the chart, showing only readings within the selected time window (1 / 5 / 10 min)

All data lives in memory only. Nothing is saved to disk or sent anywhere. When you close or refresh the tab, the session data is gone.

---

## Heart Rate Zones

The dashboard colour-codes your BPM based on standard training zones:

| Zone      | BPM        | Colour | What it means                        |
|-----------|------------|--------|--------------------------------------|
| Rest      | Below 60   | Green  | Resting, very light activity         |
| Fat Burn  | 60 – 99    | Teal   | Light effort, fat metabolism active  |
| Cardio    | 100 – 139  | Amber  | Moderate effort, cardiovascular work |
| Peak      | 140+       | Red    | High intensity, maximum effort       |

---

## Live BPM Graph

The graph shows your full session from the moment the first reading arrives. The x-axis is anchored at the session start and grows rightward — you always see the complete picture.

### Zooming and panning

| Interaction | Action |
|---|---|
| Click once | Set first boundary (red dashed line appears) |
| Click again | Zoom to the range between the two clicks |
| Click and drag | Zoom into the dragged region |
| Scroll wheel | Zoom in / out smoothly |
| Pinch (touch) | Zoom in / out |
| Ctrl + drag | Pan left / right |
| Escape | Cancel a pending first-click anchor |
| **Reset Zoom** button | Return to full session view |

The zoom and pan are restricted to the x-axis only — the y-axis (BPM range) always auto-fits to the visible data.

---

## The Floating BPM Window

Click **Float BPM** in the top-right of the dashboard to open a small always-on-top panel showing just your current BPM. You can drag it anywhere on the screen so it sits alongside whatever you're working on. Click ✕ or Float BPM again to close it.

---

## Troubleshooting

**My device doesn't appear in the Bluetooth picker**
- Make sure the monitor is turned on and worn/active (some only broadcast when they detect a pulse)
- Check that Bluetooth is enabled on your PC
- Move closer to your PC — BLE range is typically 5–10 metres but walls reduce it
- Try turning the monitor off and back on

**The picker appears but pairing fails**
- Refresh the page and try again
- Make sure no other app (phone app, Garmin Connect, etc.) is already connected to the monitor — BLE devices typically only allow one active connection at a time

**It connected but BPM shows `--` and doesn't update**
- The monitor may need a moment to detect your pulse — wait 5–10 seconds
- Make sure the sensor is positioned correctly against your skin
- Some chest strap monitors need to be slightly damp to make good contact

**It says "Web Bluetooth not supported"**
- You are using Firefox or Safari — switch to Chrome or Edge
- You may be on an older version of Chrome — update to the latest

**I closed the tab — where is my session data?**
- Session data (max, min, average, graph history) is held in memory only and is not saved. There is no way to recover it after closing the tab. If you want to log sessions, this would require a future feature addition.

---

## Browser Compatibility

| Browser        | Supported |
|----------------|-----------|
| Chrome (desktop) | Yes     |
| Edge (desktop)   | Yes     |
| Chrome (Android) | Yes     |
| Firefox          | No      |
| Safari           | No      |
| Chrome (iOS)     | No      |

Web Bluetooth is a browser API that Bluetooth access to web pages. Apple has not implemented it in Safari, and Firefox has chosen not to support it. There is no workaround for these browsers without building a native app.

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org) (LTS version recommended) — needed to run tests
- [Git](https://git-scm.com)
- Google Chrome or Microsoft Edge — required to test the dashboard (Web Bluetooth is not supported in other browsers)

### Getting started

```bash
# Clone the repo
git clone <repo-url>
cd HRM

# Install dev dependencies (Vitest test runner)
npm install
```

### Running the dashboard

The dashboard is a single HTML file with no build step. You have two options:

**Option A — open directly in Chrome (simplest)**
```
Open heart-rate-dashboard.html in Chrome or Edge
```

**Option B — serve via Vite (recommended for development)**
```bash
npx vite
```
Then open `http://localhost:5173/heart-rate-dashboard.html` in Chrome.

Vite gives you hot-reload and avoids any `file://` protocol restrictions.

### Running tests

Tests cover the five pure logic functions in `src/hrm.js` using Vitest.

```bash
# Run all tests once
npm run test:run

# Watch mode during development
npm run test
```

All tests must pass before changes are merged.

### Project structure

```
heart-rate-dashboard.html   # The complete dashboard (single file, open in Chrome)
src/
  hrm.js                    # Pure logic: BPM parsing, zones, stats, filtering
  hrm.test.js               # Vitest unit tests for src/hrm.js
```

### Contributing

1. Write a failing test in `src/hrm.test.js` before adding any logic to `src/hrm.js`
2. Implement the minimum code to make it pass
3. Run `npm run test:run` and confirm all tests are green
4. Open a pull request

## Session Files — Automatic Saving

When you disconnect your device, the dashboard automatically saves two files to the folder you chose at the start of the session.

### How it works

1. **After Bluetooth connects**, a folder picker appears — choose where you want your files saved
2. **While the session runs**, every debug log entry is written to the log file in real time
3. **When you disconnect**, the complete session JSON is written and both files are closed

If you skip the folder picker (cancel it), the files are downloaded to your browser's Downloads folder instead when you disconnect.

### Session JSON — `hrm-session-TIMESTAMP.json`

Contains the full session in structured JSON:

```json
{
  "session": {
    "device": "Decathlon HRM",
    "startedAt": "2026-05-01T10:00:00.000Z",
    "durationSeconds": 3600,
    "totalReadings": 3597
  },
  "stats": {
    "max": 172,
    "min": 58,
    "avg": 134
  },
  "readings": [
    { "ts": "2026-05-01T10:00:01.000Z", "bpm": 62 },
    { "ts": "2026-05-01T10:00:02.000Z", "bpm": 65 }
  ]
}
```

### Debug Log — `hrm-debug-TIMESTAMP.log`

A plain text file with every connection event, written in real time as the session runs:

```
[10:00:00] [ok] Web Bluetooth available — ready to connect
[10:00:03] [info] Requesting Bluetooth device...
[10:00:07] [ok] Device selected: "Decathlon HRM"
[10:00:07] [ok] GATT server connected
...
[10:30:00] [warn] Device disconnected
[10:30:00] [ok] Session written: hrm-session-2026-05-01T10-00-00.json (1797 readings)
```

### Why not save on every heartbeat?

Browsers cannot write to files continuously without the File System Access API and an open writable stream. The debug log uses exactly this — each entry is streamed to disk immediately. The session JSON is written as one complete file at the end because JSON requires a valid closing structure; writing partial JSON on every reading would produce an unreadable file.

**Memory:** Heart rate data is held in memory during the session (~300 bytes per reading). A 1-hour workout at 1 reading/second uses approximately 1 MB — negligible.

---

## Privacy

All data stays on your machine. The dashboard has no server and makes no network requests. Files are written only to the folder you explicitly choose — nothing is sent anywhere.
