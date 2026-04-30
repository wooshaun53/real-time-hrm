# Features

A complete reference of every feature in the Pulse Monitor dashboard.

---

## Bluetooth Connection

Two connection modes are available via buttons in the left panel.

### Connect Device
Scans only for devices that advertise the standard BLE `heart_rate` service. This is the most reliable mode — only compatible monitors appear in the picker.

### Connect All Devices
Scans for all nearby BLE devices regardless of advertised services. Use this if your monitor doesn't appear with Connect Device. Once connected, the dashboard still reads the `heart_rate` characteristic.

### Disconnect
Once connected, the same button becomes Disconnect. Triggering it stops notifications, saves session files, and resets the status indicator.

---

## Live BPM Display

The large number in the centre of the left panel updates every time a new reading arrives (roughly once per second). The colour changes with your heart rate zone:

| Zone | BPM | Colour |
|------|-----|--------|
| Rest | Below 60 | Green |
| Fat Burn | 60 – 99 | Teal |
| Cardio | 100 – 139 | Amber |
| Peak | 140+ | Red |

A zone progress bar beneath the number shows how far through the current zone you are.

---

## Session Statistics

Four stat cards update in real time:

| Card | Description |
|------|-------------|
| Max | Highest BPM recorded this session |
| Min | Lowest BPM recorded this session |
| Avg | Running mean, rounded to nearest integer |
| Duration | Elapsed time since first reading (M:SS) |

Stats reset when the page is refreshed. They are also written to the session JSON on disconnect.

---

## Live BPM Graph

The chart on the right panel shows every reading from the moment the first BPM arrives. The x-axis is anchored at the session start and grows rightward — the left edge never moves.

### Zoom and Pan

| Interaction | Effect |
|-------------|--------|
| Click once on chart | Sets first boundary — red dashed line appears |
| Click again | Zooms to the range between the two clicks |
| Click and drag | Drag-select a region to zoom into |
| Scroll wheel | Smooth zoom in / out |
| Pinch (touch) | Zoom in / out on touch screens |
| Ctrl + drag | Pan left / right within a zoomed view |
| Escape | Cancels a pending first-click anchor |
| **Reset Zoom** button | Returns to full session view, clears any anchor |

All zoom and pan interactions are restricted to the x-axis — the y-axis always auto-fits to the visible BPM range.

---

## Floating BPM Window

Click **Float BPM** in the header to open a compact always-on-top panel showing only the current BPM. Useful for keeping your heart rate visible while working in another application.

- Drag the panel anywhere on screen
- Click **✕** or **Float BPM** again to close it
- The BPM and colour update in sync with the main display

---

## Session File Export

When a Bluetooth device connects, a folder picker appears. Choose a folder and two files are created automatically with a shared timestamp.

### Session JSON — `hrm-session-TIMESTAMP.json`

Written once on disconnect. Contains the complete session:

```json
{
  "session": {
    "device": "Decathlon HRM",
    "startedAt": "2026-05-01T10:00:00.000Z",
    "durationSeconds": 3600,
    "totalReadings": 3597
  },
  "stats": { "max": 172, "min": 58, "avg": 134 },
  "readings": [
    { "ts": "2026-05-01T10:00:01.000Z", "bpm": 62 }
  ]
}
```

### Debug Log — `hrm-debug-TIMESTAMP.log`

Written in real time as the session runs. Every connection event, reading milestone, and error is appended immediately — the file is always current even if the browser crashes.

```
[10:00:00] [ok] Web Bluetooth available — ready to connect
[10:00:07] [ok] Device selected: "Decathlon HRM"
[10:30:00] [warn] Device disconnected
```

### Fallback

If the folder picker is cancelled, both files are downloaded to the browser's Downloads folder when the device disconnects.

---

## Debug Log Panel

The log panel at the bottom of the left column shows every internal event in the current tab session. Entry types:

| Type | Colour | Meaning |
|------|--------|---------|
| `ok` | Green | Success — connection established, file written |
| `info` | Blue | Informational — first reading, scan started |
| `warn` | Amber | Non-fatal — device disconnected, file skipped |
| `err` | Red | Error — Bluetooth unavailable, file write failed |

Click **Clear** to wipe the panel without affecting the log file on disk.

---

## Simulate Mode

Click **▶ Simulate** to inject synthetic BPM readings every second without a real device. The value starts at 72 and drifts randomly within 55–175 BPM. All features — graph, stats, zone bar, floating window, file export — behave identically to a live session.

Click **▶ Simulate** again to stop. Useful for testing and development on machines without Bluetooth hardware.
