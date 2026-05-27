import { ipcMain } from 'electron'
import { IPC } from './channels'
import { checkForUpdates, installUpdate } from '../updater'

export function registerUpdaterHandlers(): void {
  ipcMain.handle(IPC.CHECK_FOR_UPDATES, () => checkForUpdates())
  ipcMain.handle(IPC.INSTALL_UPDATE, () => installUpdate())
}
