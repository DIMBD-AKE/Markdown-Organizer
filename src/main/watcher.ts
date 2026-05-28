import chokidar, { type FSWatcher } from 'chokidar'
import path from 'path'
import type { BrowserWindow } from 'electron'
import { EXCLUDED_DIRS, UNITY_EXCLUDED, isUnityProjectSync } from './projectFilters'

let watcher: FSWatcher | null = null

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

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  watcher = chokidar.watch(projectPath, {
    ignored,
    ignoreInitial: true,
    depth: 5,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  })

  const emit = (type: 'add' | 'change' | 'unlink', filePath: string) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      win.webContents.send('file-changed', { type, path: filePath })
    }, 200)
  }

  watcher.on('add', (p) => emit('add', p))
  watcher.on('change', (p) => emit('change', p))
  watcher.on('unlink', (p) => emit('unlink', p))
  watcher.on('addDir', (p) => emit('add', p))
  watcher.on('unlinkDir', (p) => emit('unlink', p))
}

export function stopWatcher(): void {
  watcher?.close()
  watcher = null
}
