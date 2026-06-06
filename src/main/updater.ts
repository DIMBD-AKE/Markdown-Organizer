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
    const msg = err.message ?? ''
    console.warn('[updater] error:', msg)
    // 404 means update metadata (latest*.yml) is genuinely absent or the host is
    // unreachable — nothing actionable for the user, so treat as "no update".
    // Other errors (incl. 401, malformed yml) are surfaced now that the repo is
    // public; masking them hid the missing-yml bug.
    const isNoMetadata = /404|net::ERR_/i.test(msg)
    if (isNoMetadata) {
      win.webContents.send(IPC.UPDATE_NOT_AVAILABLE)
    } else {
      win.webContents.send(IPC.UPDATE_ERROR, msg)
    }
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
