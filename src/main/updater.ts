import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'

export function setupAutoUpdater(win: BrowserWindow): void {
  if (process.env.NODE_ENV === 'development') return

  autoUpdater.autoDownload = false

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update-available', info)
  })
  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update-not-available')
  })
  autoUpdater.on('download-progress', (p) => {
    win.webContents.send('update-progress', p)
  })
  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update-downloaded')
  })
  autoUpdater.on('error', (err) => {
    win.webContents.send('update-error', err.message)
  })

  setTimeout(() => autoUpdater.checkForUpdates(), 5000)
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates()
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
