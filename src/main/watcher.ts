import chokidar, { type FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'

let watcher: FSWatcher | null = null

export function startWatcher(projectPath: string, win: BrowserWindow): void {
  stopWatcher()
  if (!projectPath) return  // empty path = just stop, don't start new watcher

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  watcher = chokidar.watch(projectPath, {
    ignored: /(^|[/\\])\../,   // skip hidden files
    ignoreInitial: true,
    depth: 10
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
