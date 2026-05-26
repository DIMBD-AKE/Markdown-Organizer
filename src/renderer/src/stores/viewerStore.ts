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

  /** Open a file AND push to navigation history (use when clicking files in tree). */
  setFile(path: string, content: string): void
  /**
   * Update the displayed file WITHOUT touching history.
   * Use after goBack() / goForward() — those already moved historyIndex;
   * calling setFile() would re-append the path and corrupt forward history.
   */
  loadFile(path: string, content: string): void

  setToc(toc: TocItem[]): void
  setScrollPos(pos: number): void
  setError(err: string | null): void
  navigateTo(path: string): void
  goBack(): string | null
  goForward(): string | null
  /** Reset viewer state on project switch — stale history paths are meaningless in a different project. */
  clearForProjectSwitch(): void
}

function truncateAndAppend(history: string[], index: number, path: string): string[] {
  return [...history.slice(0, index + 1), path]
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
      const history = truncateAndAppend(s.history, s.historyIndex, path)
      return { filePath: path, content, error: null, history, historyIndex: history.length - 1 }
    }),

  // Just display the file — history was already updated by goBack/goForward
  loadFile: (path, content) => set({ filePath: path, content, error: null }),

  setToc: (toc) => set({ toc }),
  setScrollPos: (scrollPos) => set({ scrollPos }),
  setError: (error) => set({ error }),

  navigateTo: (path) =>
    set((s) => {
      const history = truncateAndAppend(s.history, s.historyIndex, path)
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
  },

  clearForProjectSwitch: () =>
    set({ filePath: null, content: null, toc: [], scrollPos: 0, history: [], historyIndex: -1, error: null }),
}))
