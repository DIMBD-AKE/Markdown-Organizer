import { describe, it, expect } from 'vitest'
import { pMap, Semaphore, withSemaphore } from '../../src/main/concurrency'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

describe('pMap', () => {
  it('returns empty array for empty input', async () => {
    const result = await pMap([], async (x) => x, 4)
    expect(result).toEqual([])
  })

  it('preserves input order in results', async () => {
    const items = [10, 5, 20, 1, 15]
    const result = await pMap(items, async (n) => {
      await sleep(n)
      return n * 2
    }, 3)
    expect(result).toEqual([20, 10, 40, 2, 30])
  })

  it('passes index to mapper', async () => {
    const items = ['a', 'b', 'c']
    const result = await pMap(items, async (v, i) => `${i}:${v}`, 2)
    expect(result).toEqual(['0:a', '1:b', '2:c'])
  })

  it('enforces concurrency limit', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const items = Array.from({ length: 20 }, (_, i) => i)

    await pMap(items, async (i) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await sleep(5)
      inFlight--
      return i
    }, 4)

    expect(maxInFlight).toBeLessThanOrEqual(4)
    expect(maxInFlight).toBeGreaterThan(0)
  })

  it('limit=1 runs sequentially', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const items = Array.from({ length: 5 }, (_, i) => i)

    await pMap(items, async (i) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await sleep(2)
      inFlight--
      return i
    }, 1)

    expect(maxInFlight).toBe(1)
  })

  it('limit higher than items.length still works', async () => {
    const result = await pMap([1, 2, 3], async (n) => n * 10, 100)
    expect(result).toEqual([10, 20, 30])
  })

  it('throws on limit < 1', async () => {
    await expect(pMap([1], async (x) => x, 0)).rejects.toThrow(/limit/)
    await expect(pMap([1], async (x) => x, -1)).rejects.toThrow(/limit/)
  })

  it('propagates errors from mapper', async () => {
    await expect(
      pMap([1, 2, 3], async (n) => {
        if (n === 2) throw new Error('boom')
        return n
      }, 2)
    ).rejects.toThrow('boom')
  })
})

describe('Semaphore', () => {
  it('throws on initial < 1', () => {
    expect(() => new Semaphore(0)).toThrow(/initial/)
    expect(() => new Semaphore(-1)).toThrow(/initial/)
  })

  it('allows immediate acquire up to initial limit', async () => {
    const sem = new Semaphore(3)
    await sem.acquire()
    await sem.acquire()
    await sem.acquire()
    expect(sem.available).toBe(0)
  })

  it('queues acquires beyond limit until release', async () => {
    const sem = new Semaphore(2)
    await sem.acquire()
    await sem.acquire()

    let acquired = false
    const pending = sem.acquire().then(() => { acquired = true })

    await sleep(10)
    expect(acquired).toBe(false)
    expect(sem.queued).toBe(1)

    sem.release()
    await pending
    expect(acquired).toBe(true)
  })

  it('release order is FIFO', async () => {
    const sem = new Semaphore(1)
    await sem.acquire()
    const order: number[] = []

    const p1 = sem.acquire().then(() => { order.push(1) })
    const p2 = sem.acquire().then(() => { order.push(2) })
    const p3 = sem.acquire().then(() => { order.push(3) })

    sem.release()
    await sleep(5)
    sem.release()
    await sleep(5)
    sem.release()
    await Promise.all([p1, p2, p3])

    expect(order).toEqual([1, 2, 3])
  })

  it('release beyond acquired increments permits (idempotent over-release safety)', async () => {
    const sem = new Semaphore(1)
    sem.release()
    expect(sem.available).toBe(2)
  })
})

describe('withSemaphore', () => {
  it('limits concurrent operations across nested async calls', async () => {
    const sem = new Semaphore(3)
    let inFlight = 0
    let maxInFlight = 0

    const ops = Array.from({ length: 30 }, (_, i) =>
      withSemaphore(sem, async () => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await sleep(3)
        inFlight--
        return i
      })
    )
    const results = await Promise.all(ops)

    expect(maxInFlight).toBeLessThanOrEqual(3)
    expect(results).toHaveLength(30)
    expect(sem.available).toBe(3)
  })

  it('releases on error', async () => {
    const sem = new Semaphore(1)
    await expect(
      withSemaphore(sem, async () => { throw new Error('fail') })
    ).rejects.toThrow('fail')
    expect(sem.available).toBe(1)
  })
})
