import chokidar, { type FSWatcher } from 'chokidar'
import path from 'path'
import type { BrowserWindow } from 'electron'
import { EXCLUDED_DIRS, UNITY_EXCLUDED, isUnityProjectSync } from './projectFilters'

let watcher: FSWatcher | null = null
let cancelBatch: (() => void) | null = null

export type FileEventType = 'add' | 'change' | 'unlink'
export type FileEvent = { type: FileEventType; path: string }

/**
 * Coalesces a burst of fs events into batched flushes.
 *
 * The old inline debounce had two bugs that made the UI "sometimes" miss
 * updates:
 *   1. It reset the timer on every event, so a continuous stream of changes
 *      arriving <waitMs apart (Dropbox sync, an editor's multi-write save, a
 *      folder copy) never flushed until the stream went quiet.
 *   2. It carried only the LAST event's {type,path} in a closure, so when a
 *      sibling file's event landed last, the change to the open document was
 *      silently dropped.
 *
 * This batcher uses a leading-edge timer (the first event arms a fixed window;
 * later events join the batch WITHOUT resetting it) so a continuous stream
 * still flushes within waitMs. It keys pending events by path so every
 * distinct path survives, with the latest type per path winning.
 */
export function createEventBatcher(
  waitMs: number,
  flush: (events: FileEvent[]) => void
): { push: (type: FileEventType, filePath: string) => void; cancel: () => void } {
  const pending = new Map<string, FileEventType>()
  let timer: ReturnType<typeof setTimeout> | null = null

  const fire = (): void => {
    timer = null
    const batch: FileEvent[] = Array.from(pending, ([p, type]) => ({ type, path: p }))
    pending.clear()
    if (batch.length) flush(batch)
  }

  return {
    push(type, filePath) {
      pending.set(filePath, type)
      if (!timer) timer = setTimeout(fire, waitMs)
    },
    cancel() {
      if (timer) clearTimeout(timer)
      timer = null
      pending.clear()
    }
  }
}

export function startWatcher(projectPath: string, win: BrowserWindow): void {
  stopWatcher()
  if (!projectPath) return  // empty path = just stop, don't start new watcher

  // Build the ignored predicate ONCE at startup. On Windows, chokidar's
  // initial walk is what makes startWatcher block — every readdir that
  // descends into node_modules/Library/etc. is a real syscall AV-scanned
  // by Defender. Skipping those dirs and non-.md files at the predicate
  // stage cuts startup from ~9.5s to <1s on a Unity project.
  const isUnity = isUnityProjectSync(projectPath)

  const ignored = (filePath: string, stats?: { isFile(): boolean }): boolean => {
    const base = path.basename(filePath)
    if (base.startsWith('.')) return true
    if (EXCLUDED_DIRS.has(base)) return true
    if (isUnity && UNITY_EXCLUDED.has(base)) return true
    // stats is only present after chokidar has stat'd the path. On the
    // first encounter it's undefined — let dirs through so we can recurse.
    if (stats && stats.isFile() && !filePath.endsWith('.md')) return true
    return false
  }

  watcher = chokidar.watch(projectPath, {
    ignored,
    ignoreInitial: true,
    depth: 5,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  })

  // Send the whole batch in ONE message. The renderer rebuilds the entire
  // file tree per message, so emitting one message per event turned a burst
  // of N files into N full recursive disk walks — CPU spike / crash on large
  // projects. One batched message = one tree rebuild, while still carrying
  // every changed path so the open-document refresh isn't lost.
  const batcher = createEventBatcher(200, (events) => {
    win.webContents.send('file-changed', { events })
  })
  cancelBatch = batcher.cancel

  watcher.on('add', (p) => batcher.push('add', p))
  watcher.on('change', (p) => batcher.push('change', p))
  watcher.on('unlink', (p) => batcher.push('unlink', p))
  watcher.on('addDir', (p) => batcher.push('add', p))
  watcher.on('unlinkDir', (p) => batcher.push('unlink', p))
}

export function stopWatcher(): void {
  cancelBatch?.()
  cancelBatch = null
  watcher?.close()
  watcher = null
}
