import type { Project, ProjectState, FileNode, AppState, SearchQuery, SearchResult } from '../renderer/src/types'

declare global {
  interface Window {
    api: {
      platform: NodeJS.Platform

      closeWindow(): Promise<void>
      minimizeWindow(): Promise<void>
      toggleMaximize(): Promise<void>
      setTitleBarOverlay(theme: 'dark' | 'black' | 'latte' | 'claude' | 'codex'): Promise<void>

      selectFolder(): Promise<string | null>
      addProject(folderPath: string): Promise<Project>
      removeProject(id: string): Promise<void>
      saveProjectState(state: ProjectState): Promise<void>

      getFileTree(dirPath: string): Promise<FileNode>
      getFileTreeStream(dirPath: string): Promise<{ rootNode: FileNode | null; error: string | null }>
      onFileTreeNode(cb: (payload: { parentPath: string; children: FileNode[] }) => void): () => void
      onFileTreeComplete(cb: (payload: { rootPath: string }) => void): () => void
      onFileTreeError(cb: (payload: { rootPath: string; error: string }) => void): () => void
      readFile(filePath: string): Promise<{ content: string | null; error: string | null }>
      getAppState(): Promise<AppState>

      getSetting(key: string): Promise<string | null>
      setSetting(key: string, value: string): Promise<void>

      onFileChanged(cb: (payload: { events: { type: string; path: string }[] }) => void): () => void
      startWatcher(projectPath: string): Promise<void>
      openPath(targetPath: string): Promise<void>
      openExternal(url: string): Promise<void>

      searchFiles(query: SearchQuery): Promise<{ results: SearchResult[]; error?: string }>

      getAppVersion(): Promise<string>
      checkForUpdates(): Promise<void>
      installUpdate(): Promise<void>
      onUpdateAvailable(cb: (info: unknown) => void): () => void
      onUpdateNotAvailable(cb: () => void): () => void
      onUpdateProgress(cb: (p: unknown) => void): () => void
      onUpdateDownloaded(cb: () => void): () => void
      onUpdateError(cb: (msg: string) => void): () => void
    }
  }
}

export {}
