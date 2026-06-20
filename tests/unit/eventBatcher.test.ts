import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createEventBatcher, type FileEvent } from '../../src/main/watcher'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createEventBatcher', () => {
  it('flushes a single event after the window', () => {
    const flush = vi.fn<(e: FileEvent[]) => void>()
    const b = createEventBatcher(200, flush)
    b.push('change', '/a.md')
    expect(flush).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(flush).toHaveBeenCalledOnce()
    expect(flush.mock.calls[0][0]).toEqual([{ type: 'change', path: '/a.md' }])
  })

  // Bug #2 regression: the old debounce kept only the LAST event's payload,
  // so a sibling change dropped the open-document change. Every distinct
  // path must survive a burst.
  it('preserves every distinct path in a burst', () => {
    const flush = vi.fn<(e: FileEvent[]) => void>()
    const b = createEventBatcher(200, flush)
    b.push('change', '/open.md')
    b.push('add', '/other.md')
    vi.advanceTimersByTime(200)
    expect(flush).toHaveBeenCalledOnce()
    const paths = flush.mock.calls[0][0].map((e) => e.path).sort()
    expect(paths).toEqual(['/open.md', '/other.md'])
  })

  // Bug #1 regression: a continuous stream arriving faster than the window
  // must still flush within waitMs of the FIRST event (leading-edge timer),
  // not starve until the stream goes quiet.
  it('flushes within the window even under a continuous stream', () => {
    const flush = vi.fn<(e: FileEvent[]) => void>()
    const b = createEventBatcher(200, flush)
    for (let i = 0; i < 10; i++) {
      b.push('add', `/f${i}.md`)
      vi.advanceTimersByTime(50) // 50ms < 200ms window, never quiets
    }
    expect(flush).toHaveBeenCalled()
    const flushed = flush.mock.calls.flatMap((c) => c[0].map((e) => e.path))
    expect(flushed.length).toBeGreaterThanOrEqual(4)
  })

  it('latest type per path wins', () => {
    const flush = vi.fn<(e: FileEvent[]) => void>()
    const b = createEventBatcher(200, flush)
    b.push('add', '/a.md')
    b.push('change', '/a.md')
    vi.advanceTimersByTime(200)
    expect(flush.mock.calls[0][0]).toEqual([{ type: 'change', path: '/a.md' }])
  })

  it('cancel drops pending events and stops the timer', () => {
    const flush = vi.fn<(e: FileEvent[]) => void>()
    const b = createEventBatcher(200, flush)
    b.push('change', '/a.md')
    b.cancel()
    vi.advanceTimersByTime(500)
    expect(flush).not.toHaveBeenCalled()
  })
})
