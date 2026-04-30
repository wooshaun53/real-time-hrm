# Heart Rate Monitor Dashboard — Build Specification

## Project Overview
Build a real-time heart rate monitor dashboard that connects to a Bluetooth heart rate monitor (Decathlon brand, but compatible with any standard BLE heart rate device) via the Web Bluetooth API. It displays live BPM, a scrolling graph, session stats, and a draggable floating mini window.

## Tech Stack
- **Single HTML file** (HTML + CSS + vanilla JS, no framework needed)
- **Chart.js** (via CDN) for the live scrolling graph
- **Web Bluetooth API** (built into Chrome/Edge — no library needed)
- No backend, no build step, no npm — just one `.html` file

## Core Features

### 1. Bluetooth Connection
- Use `navigator.bluetooth.requestDevice()` with filter `{ services: ['heart_rate'] }`
- Connect to GATT server → get `heart_rate` service → get `heart_rate_measurement` characteristic
- Start notifications and listen for `characteristicvaluechanged` events
- Parse BPM from the characteristic value:
  - Read `flags = value.getUint8(0)`
  - If bit 0 of flags is set (`flags & 0x1`), BPM is 16-bit: `value.getUint16(1, true)`
  - Otherwise BPM is 8-bit: `value.getUint8(1)`
- Handle disconnection gracefully with a `gattserverdisconnected` event listener
- Show connection status in the UI (connected / disconnected)
- Show the device name once connected

### 2. Live BPM Display
- Large prominent number showing current BPM
- Color changes based on heart rate zone (see Zones section below)
- Animated heartbeat icon in the header that pulses when connected and receiving data

### 3. Heart Rate Zones
Define zones and apply color coding across all BPM displays:

| Zone      | BPM Range  | Color  |
|-----------|------------|--------|
| Rest      | < 60       | Green  |
| Fat Burn  | 60–99      | Teal   |
| Cardio    | 100–139    | Amber  |
| Peak      | ≥ 140      | Red    |

Show the current zone name in a progress-bar style indicator below the BPM.

### 4. Scrolling Live Graph (Chart.js)
- Line chart, no point dots, smooth tension
- X-axis: timestamps (HH:MM:SS format)
- Y-axis: auto-scales to min/max of data with ~15 BPM padding
- Gradient fill under the line (red at top fading to transparent)
- Range buttons to filter visible window: **1 min**, **5 min**, **10 min**
- Store all readings in memory as `{ bpm, ts }` objects; filter by timestamp for the chart
- Disable animation for performance (`animation: false`)
- Use `chart.update('none')` for real-time updates

### 5. Session Statistics
Display four stat cards:
- **Session Max** — highest BPM recorded
- **Session Min** — lowest BPM recorded
- **Average** — running average (sum / count), rounded to integer
- **Duration** — elapsed time since first reading in `M:SS` format, updated every second

### 6. Floating Mini Window (Always-on-Top BPM)
- Small floating panel, fixed position, top-right corner by default
- Shows only the current BPM in large text, color-coded by zone
- Toggle it on/off with a "Float BPM" button in the header
- Draggable via mouse and touch events (`mousedown`/`mousemove`/`mouseup` and touch equivalents)
- Close button (✕) inside the mini window
- Semi-transparent dark background with backdrop blur

## UI / Visual Design
- **Dark theme only** — near-black background (`#0a0a0f`)
- Subtle grid background pattern using CSS `background-image` with linear-gradients
- **Fonts**: `Space Mono` (monospace, for numbers/labels) + `Syne` (sans-serif, for headings) — load from Google Fonts
- **Accent color**: Red (`#ff3d5a`) for peak/primary actions
- Layout: two-column grid — left panel (BPM card + stats + connect button) and right panel (chart)
- Status pill in header showing connected/disconnected state
- Footer showing browser compatibility note and connected device name

## Error Handling
- Check for `navigator.bluetooth` support; show a message if not available (Chrome/Edge only)
- Wrap the connect flow in try/catch; display error messages in the UI (not alert())
- Ignore `NotFoundError` (user cancelled the Bluetooth picker — not a real error)

## Browser Compatibility Note
Web Bluetooth API only works in:
- Google Chrome (desktop)
- Microsoft Edge (desktop)
- Chrome for Android

It does **not** work in Firefox or Safari. The file works when opened locally (`file://`) or served over HTTPS.

## File Output
Deliver as a single file: `heart-rate-dashboard.html`
No external dependencies beyond CDN links (Chart.js from cdnjs.cloudflare.com, Google Fonts).

---

## TDD Process — Red/Green/Refactor

Follow strict Red → Green → Refactor cycles. Do not write implementation code before a failing test exists for it.

### Test Setup
- Use **Vitest** as the test runner (install with `npm install -D vitest`)
- Extract all pure logic from the HTML into a separate module: `src/hrm.js`
- Write tests in `src/hrm.test.js`
- The HTML file imports from `src/hrm.js` for all logic
- Run tests with `npx vitest run` — all must pass before the HTML is considered done

### What to Extract into `src/hrm.js` (testable pure functions)
These functions have no DOM or Bluetooth dependency and must be unit tested:

```
parseBpm(dataView)       — parses raw BLE characteristic value → integer BPM
getZone(bpm)             — returns { name, cssClass, percent, color } for a given BPM
updateStats(state, bpm)  — returns new { max, min, sum, count, avg } given previous state and new BPM
formatDuration(seconds)  — returns "M:SS" string e.g. 65 → "1:05"
filterReadings(readings, rangeSeconds) — filters array of { bpm, ts } to only include entries within the last N seconds
```

### Red/Green Cycles — write in this order

#### Cycle 1 — `parseBpm`
**Red:** Write a test that calls `parseBpm` with a mock DataView. Assert it returns the correct integer. Test must fail (function doesn't exist yet).
```js
// 8-bit BPM (flags bit 0 = 0)
const view = new DataView(new Uint8Array([0b00000000, 72]).buffer)
expect(parseBpm(view)).toBe(72)

// 16-bit BPM (flags bit 0 = 1)
const view2 = new DataView(new Uint8Array([0b00000001, 180, 0]).buffer)
expect(parseBpm(view2)).toBe(180)
```
**Green:** Implement `parseBpm` to make tests pass.
**Refactor:** Ensure clean, readable implementation.

#### Cycle 2 — `getZone`
**Red:** Write tests for all four zone boundaries before implementing.
```js
expect(getZone(55).name).toBe('Rest')
expect(getZone(59).name).toBe('Rest')
expect(getZone(60).name).toBe('Fat Burn')
expect(getZone(99).name).toBe('Fat Burn')
expect(getZone(100).name).toBe('Cardio')
expect(getZone(139).name).toBe('Cardio')
expect(getZone(140).name).toBe('Peak')
expect(getZone(200).name).toBe('Peak')
```
Also test that `percent` is between 0–100 for all zones, and `cssClass` and `color` are non-empty strings.
**Green:** Implement `getZone`.
**Refactor:** Extract zone boundaries into a named constant array for clarity.

#### Cycle 3 — `updateStats`
**Red:** Write tests covering first reading, running average, max/min tracking.
```js
const initial = { max: null, min: null, sum: 0, count: 0 }
const s1 = updateStats(initial, 80)
expect(s1.max).toBe(80)
expect(s1.min).toBe(80)
expect(s1.avg).toBe(80)

const s2 = updateStats(s1, 100)
expect(s2.max).toBe(100)
expect(s2.min).toBe(80)
expect(s2.avg).toBe(90)

const s3 = updateStats(s2, 60)
expect(s3.min).toBe(60)
expect(s3.avg).toBe(80) // (80+100+60)/3
```
**Green:** Implement `updateStats` as a pure function (no mutation of input).
**Refactor:** Confirm immutability — input state object must not be modified.

#### Cycle 4 — `formatDuration`
**Red:**
```js
expect(formatDuration(0)).toBe('0:00')
expect(formatDuration(5)).toBe('0:05')
expect(formatDuration(65)).toBe('1:05')
expect(formatDuration(3600)).toBe('60:00')
```
**Green:** Implement `formatDuration`.

#### Cycle 5 — `filterReadings`
**Red:** Write tests using fake timestamps.
```js
const now = Date.now()
const readings = [
  { bpm: 70, ts: new Date(now - 90000) }, // 90s ago — outside 1 min
  { bpm: 80, ts: new Date(now - 30000) }, // 30s ago — inside 1 min
  { bpm: 90, ts: new Date(now - 5000) },  // 5s ago — inside 1 min
]
const result = filterReadings(readings, 60)
expect(result.length).toBe(2)
expect(result[0].bpm).toBe(80)
```
**Green:** Implement `filterReadings`.

### Running Tests
```bash
npm install -D vitest
npx vitest run          # single run
npx vitest              # watch mode during development
```

All 5 cycles must be green before integrating logic into the HTML file. The HTML file uses `<script type="module" src="src/hrm.js">` or inlines the tested functions directly after tests pass.

### What NOT to unit test
- DOM manipulation (use manual browser testing for this)
- Web Bluetooth API calls (mock-heavy, low value — test connection UI manually)
- Chart.js rendering (visual — verify manually in browser)
- Drag behaviour of mini window (interaction — verify manually)
