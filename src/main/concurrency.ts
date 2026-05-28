export class Semaphore {
  private permits: number
  private waiting: Array<() => void> = []

  constructor(initial: number) {
    if (initial < 1) throw new Error(`Semaphore: initial must be >= 1, got ${initial}`)
    this.permits = initial
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }
    return new Promise<void>((resolve) => this.waiting.push(resolve))
  }

  release(): void {
    const next = this.waiting.shift()
    if (next) next()
    else this.permits++
  }

  get available(): number { return this.permits }
  get queued(): number { return this.waiting.length }
}

export async function withSemaphore<T>(sem: Semaphore, fn: () => Promise<T>): Promise<T> {
  await sem.acquire()
  try {
    return await fn()
  } finally {
    sem.release()
  }
}

export async function pMap<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  if (limit < 1) throw new Error(`pMap: limit must be >= 1, got ${limit}`)
  if (items.length === 0) return []

  const results: R[] = new Array(items.length)
  let nextIdx = 0

  const workerCount = Math.min(limit, items.length)
  const workers: Promise<void>[] = []

  for (let w = 0; w < workerCount; w++) {
    workers.push((async () => {
      while (true) {
        const i = nextIdx++
        if (i >= items.length) return
        results[i] = await fn(items[i], i)
      }
    })())
  }

  await Promise.all(workers)
  return results
}
