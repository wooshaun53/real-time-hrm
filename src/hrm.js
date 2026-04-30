// Cycle 1 — parseBpm
export function parseBpm(dataView) {
  const flags = dataView.getUint8(0)
  return (flags & 0x1) ? dataView.getUint16(1, true) : dataView.getUint8(1)
}

// Cycle 2 — getZone
const ZONES = [
  { min: 0,   max: 59,  name: 'Rest',     cssClass: 'zone-rest',     color: '#22c55e', pctMin: 0,  pctMax: 40  },
  { min: 60,  max: 99,  name: 'Fat Burn', cssClass: 'zone-fatburn',  color: '#14b8a6', pctMin: 40, pctMax: 70  },
  { min: 100, max: 139, name: 'Cardio',   cssClass: 'zone-cardio',   color: '#f59e0b', pctMin: 70, pctMax: 90  },
  { min: 140, max: Infinity, name: 'Peak', cssClass: 'zone-peak',    color: '#ef4444', pctMin: 90, pctMax: 100 },
]

export function getZone(bpm) {
  const zone = ZONES.find(z => bpm >= z.min && bpm <= z.max)
  const { min, max, pctMin, pctMax } = zone
  const clampedMax = max === Infinity ? 200 : max
  const ratio = Math.min((bpm - min) / (clampedMax - min), 1)
  const percent = Math.round(pctMin + ratio * (pctMax - pctMin))
  return { name: zone.name, cssClass: zone.cssClass, color: zone.color, percent }
}

// Cycle 3 — updateStats
export function updateStats(state, bpm) {
  const count = state.count + 1
  const sum = state.sum + bpm
  return {
    max: state.max === null ? bpm : Math.max(state.max, bpm),
    min: state.min === null ? bpm : Math.min(state.min, bpm),
    sum,
    count,
    avg: Math.round(sum / count),
  }
}

// Cycle 4 — formatDuration
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Cycle 5 — filterReadings
export function filterReadings(readings, rangeSeconds) {
  const cutoff = Date.now() - rangeSeconds * 1000
  return readings.filter(r => r.ts.getTime() >= cutoff)
}

// Cycle 6 — buildRequestOptions
export function buildRequestOptions(scanAll) {
  if (scanAll) {
    return { acceptAllDevices: true, optionalServices: ['heart_rate'] }
  }
  return { filters: [{ services: ['heart_rate'] }] }
}

// Cycle 8 — formatLogLine
export function formatLogLine(time, type, msg) {
  return `[${time}] [${type}] ${msg}\n`
}

// Cycle 7 — buildSessionExport
export function buildSessionExport(readings, stats, deviceName, startedAt) {
  const durationSeconds = readings.length >= 2
    ? Math.round((readings[readings.length - 1].ts - readings[0].ts) / 1000)
    : 0

  return {
    session: {
      device: deviceName,
      startedAt: startedAt.toISOString(),
      durationSeconds,
      totalReadings: readings.length,
    },
    stats: {
      max: stats.max,
      min: stats.min,
      avg: stats.avg,
    },
    readings: readings.map(r => ({ ts: r.ts.toISOString(), bpm: r.bpm })),
  }
}
