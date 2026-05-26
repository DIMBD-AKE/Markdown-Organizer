import type { Project, ProjectState, FileNode, AppState, SearchQuery, SearchResult } from '../renderer/src/types'

declare global {
  interface Window {
    api: {
      selectFolder(): Promise<string | null>
      addProject(folderPath: string): Promise<Project>
      removeProject(id: string): Promise<void>
      saveProjectState(state: ProjectState): Promise<void>

      getFileTree(dirPath: string): Promise<FileNode>
      readFile(filePath: string): Promise<{ content: string | null; error: string | null }>
      getAppState(): Promise<AppState>

      getSetting(key: string): Promise<string | null>
      setSetting(key: string, value: string): Promise<void>

      onFileChanged(cb: (payload: { type: string; path: string }) => void): () => void
      startWatcher(projectPath: string): Promise<void>
      openPath(targetPath: string): Promise<void>

      searchFiles(query: SearchQuery): Promise<{ results: SearchResult[]; error?: string }>
    }
  }
}

export {}
