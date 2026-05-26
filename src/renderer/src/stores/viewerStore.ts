import { create } from 'zustand'
import type { TocItem } from '../types'

interface ViewerStore {
  filePath: string | null
  content: string | null
  toc: TocItem[]
  scrollPos: number
  history: string[]
  historyIndex: number
  error: string | null
  setFile(path: string, content: string): void
  setToc(toc: TocItem[]): void
  setScrollPos(pos: number): void
  setError(err: string | null): void
  navigateTo(path: string): void
  goBack(): string | null
  goForward(): string | null
}

export const useViewerStore = create<ViewerStore>((set, get) => ({
  filePath: null,
  content: null,
  toc: [],
  scrollPos: 0,
  history: [],
  historyIndex: -1,
  error: null,
  setFile: (path, content) =>
    set((s) => {
      const history = [...s.history.slice(0, s.historyIndex + 1), path]
      return { filePath: path, content, error: null, history, historyIndex: history.length - 1 }
    }),
  setToc: (toc) => set({ toc }),
  setScrollPos: (scrollPos) => set({ scrollPos }),
  setError: (error) => set({ error }),
  navigateTo: (path) =>
    set((s) => {
      const history = [...s.history.slice(0, s.historyIndex + 1), path]
      return { history, historyIndex: history.length - 1 }
    }),
  goBack: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return null
    const newIndex = historyIndex - 1
    set({ historyIndex: newIndex })
    return history[newIndex]
  },
  goForward: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return null
    const newIndex = historyIndex + 1
    set({ historyIndex: newIndex })
    return history[newIndex]
  }
}))
