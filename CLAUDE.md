# CLAUDE.md

This file is read automatically by Claude Code. It describes the project structure, rules, and workflows for this codebase.

---

## What This Project Is

A single-file browser dashboard that connects to a Bluetooth Low Energy heart rate monitor and displays live BPM, a scrolling graph, session statistics, and a draggable floating BPM window.

Full feature specification: `heart-rate-dashboard-spec.md`
User documentation: `README.md`

---

## Project Structure

```
/
├── CLAUDE.md                        ← you are here
├── README.md                        ← user-facing docs, do not modify unless asked
├── heart-rate-dashboard-spec.md     ← full build spec and TDD instructions, do not modify unless asked
├── heart-rate-dashboard.html        ← final deliverable (generated)
├── package.json                     ← created when you run npm install
├── src/
│   ├── hrm.js                       ← pure logic module (testable, no DOM, no Bluetooth)
│   └── hrm.test.js                  ← Vitest unit tests
```

---

## Test Commands

```bash
npm install -D vitest      # first time only
npx vitest run             # run all tests once (use this to verify red/green)
npx vitest                 # watch mode during active development
```

All tests must pass before the final `heart-rate-dashboard.html` is written.

---

## TDD Rules — Strictly Follow These

This project uses Red → Green → Refactor TDD. The spec file defines five cycles in order. Follow them exactly:

1. **Write the test first.** The test must fail before any implementation is written. Confirm it fails by running `npx vitest run` and showing the output.
2. **Write the minimum implementation** to make the test pass. Do not implement more than what the current test requires.
3. **Run tests again** to confirm green. Show the passing output.
4. **Refactor** if needed, then re-run to confirm still green.
5. **Move to the next cycle.** Do not skip ahead.

Never write implementation code in `src/hrm.js` before the corresponding test exists in `src/hrm.test.js`.

---

## What Goes in `src/hrm.js` (Pure Logic Only)

These are the only functions that belong in `src/hrm.js`. They must be pure — no DOM access, no `navigator.bluetooth`, no `document`, no `window`, no `Chart`:

| Function | Input | Output |
|---|---|---|
| `parseBpm(dataView)` | DataView from BLE characteristic | integer BPM |
| `getZone(bpm)` | integer BPM | `{ name, cssClass, percent, color }` |
| `updateStats(state, bpm)` | previous stats object + new BPM | new stats object (immutable) |
| `formatDuration(seconds)` | integer seconds | string `"M:SS"` |
| `filterReadings(readings, rangeSeconds)` | array of `{ bpm, ts }` + range in seconds | filtered array |

Export all five functions. The HTML file imports them.

---

## What Stays in the HTML File (Not Testable)

Do not attempt to unit test these — they depend on browser APIs that do not exist in Node:

- `navigator.bluetooth` — Web Bluetooth API
- DOM manipulation (`document.getElementById`, etc.)
- Chart.js rendering
- Drag event handling on the mini window
- The session timer (`setInterval`)

Verify these manually in Chrome after all unit tests are green.

---

## Why `navigator.bluetooth` Cannot Be in `src/hrm.js`

Vitest runs in Node.js. Node has no `navigator.bluetooth`, no `DataView` from BLE events, and no DOM. Any code that references these will throw immediately in the test environment. Keep all Bluetooth and DOM code inside the `<script>` tag of the HTML file only.

---

## Definition of Done

The project is complete when all of the following are true:

- [ ] `npx vitest run` exits with 0 failures, covering all 5 TDD cycles from the spec
- [ ] `heart-rate-dashboard.html` opens in Chrome without console errors
- [ ] Clicking Connect Device shows the Bluetooth picker
- [ ] Selecting a heart rate monitor updates the BPM display and graph in real time
- [ ] Session max, min, average, and duration update correctly
- [ ] Zone colour changes correctly at BPM boundaries (60, 100, 140)
- [ ] The floating mini window toggles, displays BPM, and is draggable
- [ ] Range buttons (1 min / 5 min / 10 min) correctly filter the chart
- [ ] Disconnecting the device updates the status pill and stops the timer
