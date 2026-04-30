# Post-mortem: Live BPM Chart Not Rendering

**Date:** 2026-05-01
**Severity:** Medium — core feature broken, workaround (BPM number) still functional
**Status:** Resolved

---

## Summary

The live BPM chart was completely blank after connecting a device or using the Simulate button. The BPM number, zone bar, and session stats all updated correctly. Only the Chart.js canvas failed to render. Root cause was a dead CDN URL returning HTTP 404, causing Chart.js to silently fail to load.

---

## Timeline

| Time | Event |
|------|-------|
| Session start | Chart blank reported — BPM number works, graph does not |
| +20 min | Investigated CSS: changed `.chart-wrap` from `min-height: 300px` to `height: 420px` — no effect |
| +40 min | Investigated CSS: removed `width/height: 100% !important` from canvas — no effect |
| +60 min | Added diagnostic logging to `initChart()` and `updateChart()` |
| +65 min | Confirmed `chart is null` — `initChart()` was failing silently |
| +70 min | Switched CDN → local `/node_modules/` path — Vite does not serve node_modules via path |
| +80 min | Switched to `/chart.umd.min.js` via `public/` folder — still failed |
| +90 min | Switched to `./chart.umd.min.js` relative path — still failed |
| +95 min | Inlined Chart.js (200 KB) directly into HTML — chart started working |
| +100 min | User realised they had been testing in the wrong browser (not Chrome/Edge) |
| +105 min | Rolled back all CSS changes — chart still worked, confirming CSS was never the issue |
| +110 min | Rolled back CDN → chart broke again, confirming CDN was the real issue |
| +115 min | Ran `curl` against the original CDN URL — HTTP 404 confirmed |
| +120 min | Switched to jsDelivr CDN — HTTP 200 confirmed via curl — chart works |

**Total debugging time: ~2 hours**

---

## Root Cause

The original CDN URL used in the project was:

```
https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js
```

This URL returns **HTTP 404**. Chart.js 4.x is not published to cdnjs under this path. The `Chart` global was never defined, so `new Chart(...)` threw a `ReferenceError` on page load.

The failure was silent because:
- No error was shown in the UI
- The `typeof Chart` guard was not in place
- Testing was initially done in the wrong browser (Firefox), which added unrelated noise (`navigator.bluetooth is undefined`)

---

## Contributing Factors

1. **Silent failure** — when a `<script src>` fails to load, the browser logs a console error but the application showed nothing. No user-visible indicator.
2. **Wrong browser during testing** — `navigator.bluetooth is undefined` errors made it look like a Chrome/connection issue, not a Chart.js issue.
3. **CDN URL not verified** — the URL was written by hand and never tested. A single `curl` check would have caught the 404 immediately.
4. **cdnjs has gaps** — unlike jsDelivr (which mirrors npm directly), cdnjs is manually curated. Not all npm packages and versions are available.

---

## Fix

Switched to jsDelivr, which mirrors npm and guarantees availability for any published version:

```html
<!-- Before (404) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js"></script>

<!-- After (200) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
```

---

## Lessons Learned

### 1. Always curl-verify CDN URLs before committing

```bash
curl -s -o /dev/null -w "%{http_code} %{size_download} bytes" <url>
```

A 200 with a non-trivial byte count confirms the file is real. Takes one second. Do this whenever adding any external script or stylesheet.

### 2. Prefer jsDelivr over cdnjs for npm packages

jsDelivr serves any package and version directly from npm. cdnjs requires manual submission and has version gaps. For npm packages, jsDelivr is the safer default:

```
https://cdn.jsdelivr.net/npm/<package>@<version>/dist/<file>
```

### 3. Surface dependency load failures in the UI

A guard like this at startup would have made the root cause obvious immediately:

```js
if (typeof Chart === 'undefined') {
  dbg('Chart.js failed to load — chart will not render', 'err')
  return
}
```

Without it, the symptom (blank chart) gave no indication of the real cause (missing library).

### 4. Isolate variables when debugging

Two unrelated issues were active at the same time:
- CDN URL returning 404
- Testing in the wrong browser

This created misleading noise. When a feature is broken, confirm the test environment is correct before investigating the code.

---

## Cleanup — What Was Rolled Back

All changes made during the debugging investigation were reviewed and either rolled back or intentionally kept.

| Change | Outcome |
|--------|---------|
| `.chart-wrap` `min-height: 300px` → `height: 420px` | Rolled back — not needed |
| Canvas `width: 100% !important; height: 100% !important` added | Rolled back — not in original, not needed |
| Chart.js inlined (200 KB) into HTML | Rolled back — CDN is sufficient |
| `chart.umd.min.js` file added to project root | Deleted |
| `public/` folder created | Deleted |
| `chart.js` added to `package.json` dependencies | Removed via `npm uninstall` |
| cdnjs URL → jsDelivr URL | **Kept** — this was the real fix |
| `POSTMORTEM.md` created | **Kept** — new addition |

---

## Action Items

| Item | Status |
|------|--------|
| Switch CDN to jsDelivr | Done |
| Verify URL via curl | Done |
| Roll back all debug-only changes | Done |
| Document this incident | Done |
