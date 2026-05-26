import { ipcMain } from 'electron'
import fs from 'fs'
import { IPC } from './channels'
import { getDb } from '../db'
import { getAllProjects, getProjectState, getSetting } from '../db/queries'
import { buildFileTree } from '../fs'
import type { AppState } from '../../renderer/src/types'

export function registerFileHandlers(): void {
  ipcMain.handle(IPC.GET_FILE_TREE, async (_e, dirPath: string) => {
    return buildFileTree(dirPath)
  })

  ipcMain.handle(IPC.READ_FILE, async (_e, filePath: string) => {
    try {
      return { content: fs.readFileSync(filePath, 'utf-8'), error: null }
    } catch (err: unknown) {
      return { content: null, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.GET_APP_STATE, async (): Promise<AppState> => {
    const db = getDb()
    const projects = getAllProjects(db)
    const activeProjectId = getSetting(db, 'active_project_id')
    const projectStates: AppState['projectStates'] = {}
    for (const p of projects) {
      const state = getProjectState(db, p.id)
      if (state) projectStates[p.id] = state
    }
    const theme = (getSetting(db, 'theme') ?? 'dark') as 'dark' | 'black'
    return { projects, activeProjectId, projectStates, theme, windowBounds: null }
  })
}
