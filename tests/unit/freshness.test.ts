import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getFreshness, getFreshnessColor } from '../../src/renderer/src/utils/freshness'

describe('getFreshness', () => {
  const NOW = new Date('2026-05-26').getTime()

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
  afterEach(() => { vi.useRealTimers() })

  it('returns fresh for file modified 1 day ago', () => {
    const ts = NOW - 1 * 24 * 60 * 60 * 1000
    expect(getFreshness(ts)).toBe('fresh')
  })

  it('returns warn for file modified 20 days ago', () => {
    const ts = NOW - 20 * 24 * 60 * 60 * 1000
    expect(getFreshness(ts)).toBe('warn')
  })

  it('returns stale for file modified 91 days ago', () => {
    const ts = NOW - 91 * 24 * 60 * 60 * 1000
    expect(getFreshness(ts)).toBe('stale')
  })
})

describe('getFreshnessColor', () => {
  it('maps fresh → green', () => expect(getFreshnessColor('fresh')).toBe('#a6e3a1'))
  it('maps warn → yellow', () => expect(getFreshnessColor('warn')).toBe('#f9e2af'))
  it('maps stale → red', () => expect(getFreshnessColor('stale')).toBe('#f38ba8'))
})
