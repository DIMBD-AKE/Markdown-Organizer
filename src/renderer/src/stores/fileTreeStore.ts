import { create } from 'zustand'
import type { FileNode } from '../types'

interface FileTreeStore {
  tree: FileNode | null
  expandedDirs: Set<string>
  selectedFile: string | null
  isLoading: boolean
  setTree(tree: FileNode | null): void
  setSelectedFile(path: string | null): void
  toggleDir(path: string): void
  setExpandedDirs(paths: string[]): void
  expandDirs(paths: string[]): void
  setLoading(isLoading: boolean): void
}

export const useFileTreeStore = create<FileTreeStore>((set) => ({
  tree: null,
  expandedDirs: new Set(),
  selectedFile: null,
  isLoading: false,
  setTree: (tree) => set({ tree }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  toggleDir: (path) =>
    set((s) => {
      const next = new Set(s.expandedDirs)
      next.has(path) ? next.delete(path) : next.add(path)
      return { expandedDirs: next }
    }),
  setExpandedDirs: (paths) => set({ expandedDirs: new Set(paths) }),
  expandDirs: (paths) =>
    set((s) => {
      const next = new Set(s.expandedDirs)
      paths.forEach((p) => next.add(p))
      return { expandedDirs: next }
    }),
  setLoading: (isLoading) => set({ isLoading })
}))
