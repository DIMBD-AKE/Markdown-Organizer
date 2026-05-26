import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../main/ipc/channels'

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke(IPC.SELECT_FOLDER),
  addProject: (folderPath: string) => ipcRenderer.invoke(IPC.ADD_PROJECT, folderPath),
  removeProject: (id: string) => ipcRenderer.invoke(IPC.REMOVE_PROJECT, id),
  saveProjectState: (state: unknown) => ipcRenderer.invoke(IPC.SAVE_PROJECT_STATE, state),

  getFileTree: (dirPath: string) => ipcRenderer.invoke(IPC.GET_FILE_TREE, dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke(IPC.READ_FILE, filePath),
  getAppState: () => ipcRenderer.invoke(IPC.GET_APP_STATE),

  getSetting: (key: string) => ipcRenderer.invoke(IPC.GET_SETTING, key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke(IPC.SET_SETTING, key, value),

  onFileChanged: (cb: (payload: { type: string; path: string }) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: { type: string; path: string }) => cb(payload)
    ipcRenderer.on(IPC.FILE_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC.FILE_CHANGED, listener)
  },

  startWatcher: (projectPath: string) => ipcRenderer.invoke(IPC.START_WATCHER, projectPath),
  openPath: (targetPath: string) => ipcRenderer.invoke(IPC.OPEN_PATH, targetPath),

  searchFiles: (query: unknown) => ipcRenderer.invoke(IPC.SEARCH_FILES, query),
})
