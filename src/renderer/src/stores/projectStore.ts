import { create } from 'zustand'
import type { Project } from '../types'

interface ProjectStore {
  projects: Project[]
  activeProjectId: string | null
  setProjects(projects: Project[]): void
  setActiveProject(id: string | null): void
  addProject(project: Project): void
  removeProject(id: string): void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProjectId: null,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProjectId) => set({ activeProjectId }),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
}))

// Selector helper — use as: useProjectStore(activeProject)
export const activeProject = (s: ReturnType<typeof useProjectStore.getState>) =>
  s.projects.find((p) => p.id === s.activeProjectId) ?? null
