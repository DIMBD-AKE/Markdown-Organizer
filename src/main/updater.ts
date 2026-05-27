import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'
import { IPC } from './ipc/channels'

export function setupAutoUpdater(win: BrowserWindow): void {
  if (process.env.NODE_ENV === 'development') return

  autoUpdater.autoDownload = true

  autoUpdater.on('update-available', (info) => {
    win.webContents.send(IPC.UPDATE_AVAILABLE, info)
  })
  autoUpdater.on('update-not-available', () => {
    win.webContents.send(IPC.UPDATE_NOT_AVAILABLE)
  })
  autoUpdater.on('download-progress', (p) => {
    win.webContents.send(IPC.UPDATE_PROGRESS, p)
  })
  autoUpdater.on('update-downloaded', () => {
    win.webContents.send(IPC.UPDATE_DOWNLOADED)
  })
  autoUpdater.on('error', (err) => {
    win.webContents.send(IPC.UPDATE_ERROR, err.message)
  })

  setTimeout(() => autoUpdater.checkForUpdates(), 5000)
}

export function checkForUpdates(): void {
  if (process.env.NODE_ENV === 'development') return
  autoUpdater.checkForUpdates()
}

export function installUpdate(): void {
  if (process.env.NODE_ENV === 'development') return
  autoUpdater.quitAndInstall()
}
