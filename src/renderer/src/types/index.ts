export type ProjectType =
  | 'unity' | 'unreal' | 'node' | 'rust' | 'python'
  | 'ai-research' | 'docs' | 'unknown'

export interface Project {
  id: string
  name: string
  path: string
  type: ProjectType
  icon: string
  lastOpened: number | null
  createdAt: number
}

export interface FileNode {
  name: string
  path: string
  isDir: boolean
  children?: FileNode[]
  modifiedAt: number
  mdCount?: number
}

export interface ProjectState {
  projectId: string
  lastFile: string | null
  scrollPos: number
  expandedDirs: string[]
  searchHistory: string[]
}

export interface AppState {
  projects: Project[]
  activeProjectId: string | null
  projectStates: Record<string, ProjectState>
  theme: 'dark' | 'black'
  windowBounds: { width: number; height: number; x: number; y: number } | null
}

export interface TocItem {
  id: string
  text: string
  level: number
  children: TocItem[]
}

export type Freshness = 'fresh' | 'warn' | 'stale'
