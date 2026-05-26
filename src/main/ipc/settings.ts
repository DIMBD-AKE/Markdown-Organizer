import { ipcMain } from 'electron'
import { IPC } from './channels'
import { getDb } from '../db'
import { getSetting, setSetting } from '../db/queries'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.GET_SETTING, async (_e, key: string) => getSetting(getDb(), key))
  ipcMain.handle(IPC.SET_SETTING, async (_e, key: string, value: string) => {
    setSetting(getDb(), key, value)
  })
}
