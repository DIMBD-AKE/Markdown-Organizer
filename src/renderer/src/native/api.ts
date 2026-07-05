import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type {
  AppState,
  FileNode,
  Project,
  ProjectState,
  SearchQuery,
  SearchResult
} from '../types'

type DesktopPlatform = 'darwin' | 'win32' | 'linux' | 'unknown'
type Unsubscribe = () => void

interface UpdateInfo {
  version?: string
  notes?: string
  date?: string
}

function platform(): DesktopPlatform {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'darwin'
  if (ua.includes('windows')) return 'win32'
  if (ua.includes('linux')) return 'linux'
  return 'unknown'
}

function subscribe<T>(eventName: string, cb: (payload: T) => void): Unsubscribe {
  let unlisten: Unsubscribe | null = null
  listen<T>(eventName, (event) => cb(event.payload))
    .then((fn) => { unlisten = fn })
    .catch((err) => console.error(`Failed to subscribe to ${eventName}:`, err))
  return () => {
    if (unlisten) unlisten()
  }
}

export function installNativeApi(): void {
  const api: Window['api'] = {
    platform: platform(),

    closeWindow: () => invoke('close_window'),
    minimizeWindow: () => invoke('minimize_window'),
    toggleMaximize: () => invoke('toggle_maximize'),
    startWindowDrag: () => getCurrentWindow().startDragging(),
    setTitleBarOverlay: (theme) => invoke('set_title_bar_overlay', { theme }),

    selectFolder: () => invoke<string | null>('select_folder'),
    addProject: (folderPath: string) => invoke<Project>('add_project', { folderPath }),
    removeProject: (id: string) => invoke('remove_project', { id }),
    saveProjectState: (state: ProjectState) => invoke('save_project_state', { state }),

    getFileTree: (dirPath: string) => invoke<FileNode>('get_file_tree', { dirPath }),
    getFileTreeStream: (dirPath: string) =>
      invoke<{ rootNode: FileNode | null; error: string | null }>('get_file_tree_stream', { dirPath }),
    onFileTreeNode: (cb) => subscribe('file-tree-node', cb),
    onFileTreeComplete: (cb) => subscribe('file-tree-complete', cb),
    onFileTreeError: (cb) => subscribe('file-tree-error', cb),
    readFile: (filePath: string) =>
      invoke<{ content: string | null; error: string | null }>('read_file', { filePath }),
    getAppState: () => invoke<AppState>('get_app_state'),

    getSetting: (key: string) => invoke<string | null>('get_setting', { key }),
    setSetting: (key: string, value: string) => invoke('set_setting', { key, value }),

    onFileChanged: (cb) => subscribe('file-changed', cb),
    startWatcher: (projectPath: string) => invoke('start_watcher', { projectPath }),
    openPath: (targetPath: string) => invoke('open_path', { targetPath }),
    openExternal: (url: string) => invoke('open_external', { url }),

    searchFiles: (query: SearchQuery) =>
      invoke<{ results: SearchResult[]; error?: string }>('search_files', { query }),

    getAppVersion: () => invoke<string>('get_app_version'),
    checkForUpdates: () => invoke('check_for_updates'),
    installUpdate: () => invoke('install_update'),
    onUpdateAvailable: (cb) => subscribe<UpdateInfo>('update-available', cb),
    onUpdateNotAvailable: (cb) => subscribe('update-not-available', cb),
    onUpdateProgress: (cb) => subscribe('update-progress', cb),
    onUpdateDownloaded: (cb) => subscribe('update-downloaded', cb),
    onUpdateError: (cb) => subscribe<string>('update-error', cb),
  }
  window.api = api
}
