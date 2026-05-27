import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import path from 'path'
import { IPC } from './channels'
import { getDb } from '../db'
import { upsertProject, deleteProject, upsertProjectState } from '../db/queries'
import { analyzeDirectory } from '../detector'
import { startWatcher } from '../watcher'
import { isAllowedExternalUrl } from '../url'
import type { Project, ProjectState } from '../../renderer/src/types'

export function registerProjectHandlers(): void {
  ipcMain.handle(IPC.SELECT_FOLDER, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.ADD_PROJECT, async (_e, folderPath: string) => {
    const db = getDb()
    const result = await analyzeDirectory(folderPath)
    const project: Project = {
      id: randomUUID(),
      name: path.basename(folderPath),
      path: folderPath,
      type: result.primaryType,
      icon: result.icon,
      lastOpened: Date.now(),
      createdAt: Date.now(),
      frameworks: result.frameworks,
      confidence: result.confidence,
    }
    upsertProject(db, project)
    return project
  })

  ipcMain.handle(IPC.REMOVE_PROJECT, async (_e, id: string) => {
    deleteProject(getDb(), id)
  })

  ipcMain.handle(IPC.SAVE_PROJECT_STATE, async (_e, state: ProjectState) => {
    upsertProjectState(getDb(), state)
  })

  ipcMain.handle(IPC.START_WATCHER, (_e, projectPath: string) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) startWatcher(projectPath, win)
  })

  ipcMain.handle(IPC.OPEN_PATH, async (_e, targetPath: string) => {
    await shell.openPath(targetPath)
  })

  ipcMain.handle(IPC.OPEN_EXTERNAL, async (_e, url: string) => {
    if (!isAllowedExternalUrl(url)) return
    await shell.openExternal(url)
  })
}
