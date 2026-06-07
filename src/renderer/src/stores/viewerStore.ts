import { create } from 'zustand'
import type { TocItem } from '../types'

interface ViewerStore {
  filePath: string | null
  content: string | null
  toc: TocItem[]
  /** Ids of TOC headings whose children are collapsed. Reset per document. */
  collapsedTocIds: Set<string>
  /** True while a selected file's content is being read. Lets the viewer show
   *  its own spinner independent of the file-tree scan. */
  isFileLoading: boolean
  scrollPos: number
  history: string[]
  historyIndex: number
  error: string | null

  /** Open a file AND push to navigation history (use when clicking files in tree). */
  setFile(path: string, content: string): void
  /** Mark a file as selected + loading immediately, before its content arrives.
   *  Does NOT push history — setFile (called on resolve) owns the history push. */
  beginFileLoad(path: string): void
  /**
   * Update the displayed file WITHOUT touching history.
   * Use after goBack() / goForward() — those already moved historyIndex;
   * calling setFile() would re-append the path and corrupt forward history.
   */
  loadFile(path: string, content: string): void

  setToc(toc: TocItem[]): void
  toggleTocCollapse(id: string): void
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
  collapsedTocIds: new Set(),
  isFileLoading: false,
  scrollPos: 0,
  history: [],
  historyIndex: -1,
  error: null,

  setFile: (path, content) =>
    set((s) => {
      const history = truncateAndAppend(s.history, s.historyIndex, path)
      return { filePath: path, content, error: null, isFileLoading: false, collapsedTocIds: new Set(), history, historyIndex: history.length - 1 }
    }),

  beginFileLoad: (path) =>
    set({ filePath: path, content: null, error: null, isFileLoading: true, collapsedTocIds: new Set() }),

  // Just display the file — history was already updated by goBack/goForward
  loadFile: (path, content) => set({ filePath: path, content, error: null, isFileLoading: false, collapsedTocIds: new Set() }),

  setToc: (toc) => set({ toc }),
  toggleTocCollapse: (id) =>
    set((s) => {
      const next = new Set(s.collapsedTocIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { collapsedTocIds: next }
    }),
  setScrollPos: (scrollPos) => set({ scrollPos }),
  setError: (error) => set({ error, isFileLoading: false }),

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
    set({ filePath: null, content: null, toc: [], collapsedTocIds: new Set(), isFileLoading: false, scrollPos: 0, history: [], historyIndex: -1, error: null }),
}))
