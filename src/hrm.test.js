import { describe, it, expect } from 'vitest'
import { parseBpm, getZone, updateStats, formatDuration, filterReadings, buildRequestOptions, buildSessionExport, formatLogLine } from './hrm.js'

// Cycle 1 — parseBpm
describe('parseBpm', () => {
  it('parses 8-bit BPM when flags bit 0 is 0', () => {
    const view = new DataView(new Uint8Array([0b00000000, 72]).buffer)
    expect(parseBpm(view)).toBe(72)
  })

  it('parses 16-bit BPM when flags bit 0 is 1', () => {
    const view = new DataView(new Uint8Array([0b00000001, 180, 0]).buffer)
    expect(parseBpm(view)).toBe(180)
  })

  it('returns integer for 8-bit high values', () => {
    const view = new DataView(new Uint8Array([0, 200]).buffer)
    expect(parseBpm(view)).toBe(200)
  })
})

// Cycle 2 — getZone
describe('getZone', () => {
  it('returns Rest for BPM < 60', () => {
    expect(getZone(55).name).toBe('Rest')
    expect(getZone(59).name).toBe('Rest')
  })

  it('returns Fat Burn for BPM 60–99', () => {
    expect(getZone(60).name).toBe('Fat Burn')
    expect(getZone(99).name).toBe('Fat Burn')
  })

  it('returns Cardio for BPM 100–139', () => {
    expect(getZone(100).name).toBe('Cardio')
    expect(getZone(139).name).toBe('Cardio')
  })

  it('returns Peak for BPM >= 140', () => {
    expect(getZone(140).name).toBe('Peak')
    expect(getZone(200).name).toBe('Peak')
  })

  it('returns percent between 0 and 100 for all zones', () => {
    [30, 70, 120, 160].forEach(bpm => {
      const { percent } = getZone(bpm)
      expect(percent).toBeGreaterThanOrEqual(0)
      expect(percent).toBeLessThanOrEqual(100)
    })
  })

  it('returns non-empty cssClass and color strings', () => {
    [30, 70, 120, 160].forEach(bpm => {
      const { cssClass, color } = getZone(bpm)
      expect(typeof cssClass).toBe('string')
      expect(cssClass.length).toBeGreaterThan(0)
      expect(typeof color).toBe('string')
      expect(color.length).toBeGreaterThan(0)
    })
  })
})

// Cycle 3 — updateStats
describe('updateStats', () => {
  const initial = { max: null, min: null, sum: 0, count: 0 }

  it('sets max, min, avg correctly on first reading', () => {
    const s1 = updateStats(initial, 80)
    expect(s1.max).toBe(80)
    expect(s1.min).toBe(80)
    expect(s1.avg).toBe(80)
  })

  it('updates max and avg on second reading', () => {
    const s1 = updateStats(initial, 80)
    const s2 = updateStats(s1, 100)
    expect(s2.max).toBe(100)
    expect(s2.min).toBe(80)
    expect(s2.avg).toBe(90)
  })

  it('updates min correctly', () => {
    const s1 = updateStats(initial, 80)
    const s2 = updateStats(s1, 100)
    const s3 = updateStats(s2, 60)
    expect(s3.min).toBe(60)
    expect(s3.avg).toBe(80) // (80+100+60)/3
  })

  it('does not mutate the input state', () => {
    const s1 = updateStats(initial, 80)
    const copy = { ...s1 }
    updateStats(s1, 200)
    expect(s1.max).toBe(copy.max)
    expect(s1.min).toBe(copy.min)
    expect(s1.sum).toBe(copy.sum)
    expect(s1.count).toBe(copy.count)
  })
})

// Cycle 4 — formatDuration
describe('formatDuration', () => {
  it('formats 0 seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('formats single-digit seconds with leading zero', () => {
    expect(formatDuration(5)).toBe('0:05')
  })

  it('formats 65 seconds', () => {
    expect(formatDuration(65)).toBe('1:05')
  })

  it('formats exactly one hour (3600 seconds)', () => {
    expect(formatDuration(3600)).toBe('60:00')
  })
})

// Cycle 5 — filterReadings
describe('filterReadings', () => {
  it('filters readings outside the range window', () => {
    const now = Date.now()
    const readings = [
      { bpm: 70, ts: new Date(now - 90000) }, // 90s ago — outside 1 min
      { bpm: 80, ts: new Date(now - 30000) }, // 30s ago — inside 1 min
      { bpm: 90, ts: new Date(now - 5000) },  // 5s ago — inside 1 min
    ]
    const result = filterReadings(readings, 60)
    expect(result.length).toBe(2)
    expect(result[0].bpm).toBe(80)
  })

  it('returns all readings when range covers all timestamps', () => {
    const now = Date.now()
    const readings = [
      { bpm: 70, ts: new Date(now - 30000) },
      { bpm: 80, ts: new Date(now - 10000) },
    ]
    expect(filterReadings(readings, 60).length).toBe(2)
  })

  it('returns empty array when all readings are outside range', () => {
    const now = Date.now()
    const readings = [
      { bpm: 70, ts: new Date(now - 120000) },
    ]
    expect(filterReadings(readings, 60).length).toBe(0)
  })

  it('returns empty array for empty input', () => {
    expect(filterReadings([], 60)).toEqual([])
  })
})

// Cycle 6 — buildRequestOptions
describe('buildRequestOptions', () => {
  it('uses heart_rate service filter when scanAll is false', () => {
    const opts = buildRequestOptions(false)
    expect(opts.filters).toEqual([{ services: ['heart_rate'] }])
    expect(opts.acceptAllDevices).toBeUndefined()
  })

  it('uses acceptAllDevices with optionalServices when scanAll is true', () => {
    const opts = buildRequestOptions(true)
    expect(opts.acceptAllDevices).toBe(true)
    expect(opts.optionalServices).toContain('heart_rate')
    expect(opts.filters).toBeUndefined()
  })

  it('does not include both filters and acceptAllDevices (Chrome rejects that)', () => {
    const optsFiltered = buildRequestOptions(false)
    expect(optsFiltered.acceptAllDevices).toBeUndefined()

    const optsAll = buildRequestOptions(true)
    expect(optsAll.filters).toBeUndefined()
  })
})

// Cycle 7 — buildSessionExport
describe('buildSessionExport', () => {
  const startedAt = new Date('2026-05-01T10:00:00.000Z')
  const readings = [
    { bpm: 80, ts: new Date('2026-05-01T10:00:01.000Z') },
    { bpm: 100, ts: new Date('2026-05-01T10:00:02.000Z') },
    { bpm: 60, ts: new Date('2026-05-01T10:00:03.000Z') },
  ]
  const stats = { max: 100, min: 60, avg: 80, sum: 240, count: 3 }

  it('includes session metadata', () => {
    const out = buildSessionExport(readings, stats, 'Test HRM', startedAt)
    expect(out.session.device).toBe('Test HRM')
    expect(out.session.startedAt).toBe('2026-05-01T10:00:00.000Z')
    expect(out.session.totalReadings).toBe(3)
  })

  it('calculates duration in seconds from first to last reading', () => {
    const out = buildSessionExport(readings, stats, 'Test HRM', startedAt)
    expect(out.session.durationSeconds).toBe(2) // 10:00:03 - 10:00:01
  })

  it('includes stats summary', () => {
    const out = buildSessionExport(readings, stats, 'Test HRM', startedAt)
    expect(out.stats.max).toBe(100)
    expect(out.stats.min).toBe(60)
    expect(out.stats.avg).toBe(80)
  })

  it('maps readings to { ts, bpm } with ISO timestamp strings', () => {
    const out = buildSessionExport(readings, stats, 'Test HRM', startedAt)
    expect(out.readings).toHaveLength(3)
    expect(out.readings[0]).toEqual({
      ts: '2026-05-01T10:00:01.000Z',
      bpm: 80,
    })
  })

  it('returns empty readings array when no readings recorded', () => {
    const emptyStats = { max: null, min: null, avg: null, sum: 0, count: 0 }
    const out = buildSessionExport([], emptyStats, 'Test HRM', startedAt)
    expect(out.readings).toEqual([])
    expect(out.session.durationSeconds).toBe(0)
  })
})

// Cycle 8 — formatLogLine
describe('formatLogLine', () => {
  it('formats a line with time, type, and message', () => {
    const line = formatLogLine('10:00:01', 'ok', 'Connected')
    expect(line).toBe('[10:00:01] [ok] Connected\n')
  })

  it('works for all log types', () => {
    expect(formatLogLine('09:00:00', 'info', 'Scanning...')).toBe('[09:00:00] [info] Scanning...\n')
    expect(formatLogLine('09:00:01', 'err',  'Failed')).toBe('[09:00:01] [err] Failed\n')
    expect(formatLogLine('09:00:02', 'warn', 'Disconnected')).toBe('[09:00:02] [warn] Disconnected\n')
  })

  it('ends with a newline so entries stack correctly in the file', () => {
    const line = formatLogLine('10:00:00', 'info', 'test')
    expect(line.endsWith('\n')).toBe(true)
  })
})
