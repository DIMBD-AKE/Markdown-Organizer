import type { AppState, Project, ProjectState } from './types'

export interface StartupProjectSession {
  project: Project
  projectState: ProjectState | null
  expandedDirs: string[]
  lastFile: string | null
  scrollPos: number
  scrollPositions: Record<string, number>
}

export function getStartupProjectSession(state: AppState): StartupProjectSession | null {
  if (!state.activeProjectId) return null

  const project = state.projects.find((p) => p.id === state.activeProjectId)
  if (!project) return null

  const projectState = state.projectStates[state.activeProjectId] ?? null
  return {
    project,
    projectState,
    expandedDirs: projectState?.expandedDirs ?? [],
    lastFile: projectState?.lastFile ?? null,
    scrollPos: projectState?.scrollPos ?? 0,
    scrollPositions: projectState?.scrollPositions ?? {},
  }
}
