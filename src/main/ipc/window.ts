import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from './channels'

export function registerWindowHandlers(): void {
  ipcMain.handle(IPC.CLOSE_WINDOW, () => {
    BrowserWindow.getFocusedWindow()?.close()
  })
  ipcMain.handle(IPC.MINIMIZE_WINDOW, () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })
  ipcMain.handle(IPC.TOGGLE_MAXIMIZE, () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
}
