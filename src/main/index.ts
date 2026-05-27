import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { registerAllHandlers } from './ipc'
import { getDb, closeDb } from './db'
import { getSetting, setSetting, getAllProjects } from './db/queries'
import { startWatcher, stopWatcher } from './watcher'
import { setupAutoUpdater } from './updater'

function createWindow(): BrowserWindow {
  const db = getDb()
  const w = parseInt(getSetting(db, 'window_width') ?? '1280', 10)
  const h = parseInt(getSetting(db, 'window_height') ?? '800', 10)

  const win = new BrowserWindow({
    width: w,
    height: h,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    // Windows: native control overlay (min/max/close) at 40px height matching h-10
    ...(process.platform === 'win32' ? {
      titleBarOverlay: { color: '#1e1e2e', symbolColor: '#cdd6f4', height: 40 }
    } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('resize', () => {
    const [width, height] = win.getSize()
    setSetting(db, 'window_width', String(width))
    setSetting(db, 'window_height', String(height))
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  registerAllHandlers()
  const win = createWindow()
  setupAutoUpdater(win)

  // Start watcher if there's an active project
  const db = getDb()
  const activeId = getSetting(db, 'active_project_id')
  if (activeId) {
    const projects = getAllProjects(db)
    const active = projects.find((p) => p.id === activeId)
    if (active) startWatcher(active.path, win)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopWatcher()
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})
