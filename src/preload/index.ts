import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../main/ipc/channels'

contextBridge.exposeInMainWorld('api', {
  platform: process.platform as NodeJS.Platform,

  closeWindow: () => ipcRenderer.invoke(IPC.CLOSE_WINDOW),
  minimizeWindow: () => ipcRenderer.invoke(IPC.MINIMIZE_WINDOW),
  toggleMaximize: () => ipcRenderer.invoke(IPC.TOGGLE_MAXIMIZE),
  setTitleBarOverlay: (theme: 'dark' | 'black' | 'latte' | 'claude' | 'codex') =>
    ipcRenderer.invoke(IPC.SET_TITLE_BAR_OVERLAY, theme),

  selectFolder: () => ipcRenderer.invoke(IPC.SELECT_FOLDER),
  addProject: (folderPath: string) => ipcRenderer.invoke(IPC.ADD_PROJECT, folderPath),
  removeProject: (id: string) => ipcRenderer.invoke(IPC.REMOVE_PROJECT, id),
  saveProjectState: (state: unknown) => ipcRenderer.invoke(IPC.SAVE_PROJECT_STATE, state),

  getFileTree: (dirPath: string) => ipcRenderer.invoke(IPC.GET_FILE_TREE, dirPath),
  getFileTreeStream: (dirPath: string) => ipcRenderer.invoke(IPC.GET_FILE_TREE_STREAM, dirPath),
  onFileTreeNode: (cb: (payload: { parentPath: string; children: unknown[] }) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: { parentPath: string; children: unknown[] }) => cb(payload)
    ipcRenderer.on(IPC.FILE_TREE_NODE, listener)
    return () => ipcRenderer.removeListener(IPC.FILE_TREE_NODE, listener)
  },
  onFileTreeComplete: (cb: (payload: { rootPath: string }) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: { rootPath: string }) => cb(payload)
    ipcRenderer.on(IPC.FILE_TREE_COMPLETE, listener)
    return () => ipcRenderer.removeListener(IPC.FILE_TREE_COMPLETE, listener)
  },
  onFileTreeError: (cb: (payload: { rootPath: string; error: string }) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: { rootPath: string; error: string }) => cb(payload)
    ipcRenderer.on(IPC.FILE_TREE_ERROR, listener)
    return () => ipcRenderer.removeListener(IPC.FILE_TREE_ERROR, listener)
  },
  readFile: (filePath: string) => ipcRenderer.invoke(IPC.READ_FILE, filePath),
  getAppState: () => ipcRenderer.invoke(IPC.GET_APP_STATE),

  getSetting: (key: string) => ipcRenderer.invoke(IPC.GET_SETTING, key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke(IPC.SET_SETTING, key, value),

  onFileChanged: (cb: (payload: { events: { type: string; path: string }[] }) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: { events: { type: string; path: string }[] }) => cb(payload)
    ipcRenderer.on(IPC.FILE_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC.FILE_CHANGED, listener)
  },

  startWatcher: (projectPath: string) => ipcRenderer.invoke(IPC.START_WATCHER, projectPath),
  openPath: (targetPath: string) => ipcRenderer.invoke(IPC.OPEN_PATH, targetPath),
  openExternal: (url: string) => ipcRenderer.invoke(IPC.OPEN_EXTERNAL, url),

  searchFiles: (query: unknown) => ipcRenderer.invoke(IPC.SEARCH_FILES, query),

  getAppVersion: () => ipcRenderer.invoke(IPC.GET_APP_VERSION),
  checkForUpdates: () => ipcRenderer.invoke(IPC.CHECK_FOR_UPDATES),
  installUpdate: () => ipcRenderer.invoke(IPC.INSTALL_UPDATE),

  onUpdateAvailable: (cb: (info: unknown) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, info: unknown) => cb(info)
    ipcRenderer.on(IPC.UPDATE_AVAILABLE, listener)
    return () => ipcRenderer.removeListener(IPC.UPDATE_AVAILABLE, listener)
  },
  onUpdateNotAvailable: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on(IPC.UPDATE_NOT_AVAILABLE, listener)
    return () => ipcRenderer.removeListener(IPC.UPDATE_NOT_AVAILABLE, listener)
  },
  onUpdateProgress: (cb: (p: unknown) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, p: unknown) => cb(p)
    ipcRenderer.on(IPC.UPDATE_PROGRESS, listener)
    return () => ipcRenderer.removeListener(IPC.UPDATE_PROGRESS, listener)
  },
  onUpdateDownloaded: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on(IPC.UPDATE_DOWNLOADED, listener)
    return () => ipcRenderer.removeListener(IPC.UPDATE_DOWNLOADED, listener)
  },
  onUpdateError: (cb: (msg: string) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, msg: string) => cb(msg)
    ipcRenderer.on(IPC.UPDATE_ERROR, listener)
    return () => ipcRenderer.removeListener(IPC.UPDATE_ERROR, listener)
  },
})
