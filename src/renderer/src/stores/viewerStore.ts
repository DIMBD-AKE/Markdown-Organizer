import { create } from 'zustand'
import type { TocItem } from '../types'

interface PendingScrollRestore {
  path: string
  scrollPos: number
}

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
  scrollPositions: Record<string, number>
  pendingScrollRestore: PendingScrollRestore | null
  history: string[]
  historyIndex: number
  error: string | null

  /** Open a file AND push to navigation history (use when clicking files in tree). */
  setFile(path: string, content: string): void
  /** Mark a file as selected + loading immediately, before its content arrives.
   *  Does NOT push history — setFile (called on resolve) owns the history push. */
  beginFileLoad(path: string, options?: { preserveScroll?: boolean }): void
  /**
   * Update the displayed file WITHOUT touching history.
   * Use after goBack() / goForward() — those already moved historyIndex;
   * calling setFile() would re-append the path and corrupt forward history.
   */
  loadFile(path: string, content: string): void

  setToc(toc: TocItem[]): void
  toggleTocCollapse(id: string): void
  setScrollPos(pos: number): void
  setScrollPositions(positions: Record<string, number>): void
  completeScrollRestore(path: string): void
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

function rememberCurrentScroll(state: ViewerStore): Record<string, number> {
  if (!state.filePath) return state.scrollPositions
  if (state.scrollPositions[state.filePath] === state.scrollPos) {
    return state.scrollPositions
  }
  return { ...state.scrollPositions, [state.filePath]: state.scrollPos }
}

function scrollForPath(state: ViewerStore, path: string, scrollPositions: Record<string, number>): number {
  if (state.filePath === path) return state.scrollPos
  return scrollPositions[path] ?? 0
}

function hasRememberedScroll(scrollPositions: Record<string, number>, path: string): boolean {
  return Object.prototype.hasOwnProperty.call(scrollPositions, path)
}

function pendingRestoreForPath(
  state: ViewerStore,
  path: string,
  scrollPos: number,
  scrollPositions: Record<string, number>,
  force = false
): PendingScrollRestore | null {
  if (state.pendingScrollRestore?.path === path) return state.pendingScrollRestore
  if (!force && !hasRememberedScroll(scrollPositions, path)) return null
  return { path, scrollPos }
}

export const useViewerStore = create<ViewerStore>((set, get) => ({
  filePath: null,
  content: null,
  toc: [],
  collapsedTocIds: new Set(),
  isFileLoading: false,
  scrollPos: 0,
  scrollPositions: {},
  pendingScrollRestore: null,
  history: [],
  historyIndex: -1,
  error: null,

  setFile: (path, content) =>
    set((s) => {
      const scrollPositions = rememberCurrentScroll(s)
      const history = truncateAndAppend(s.history, s.historyIndex, path)
      const scrollPos = scrollForPath(s, path, scrollPositions)
      return {
        filePath: path,
        content,
        error: null,
        isFileLoading: false,
        collapsedTocIds: new Set(),
        scrollPos,
        scrollPositions,
        pendingScrollRestore: pendingRestoreForPath(s, path, scrollPos, scrollPositions),
        history,
        historyIndex: history.length - 1,
      }
    }),

  beginFileLoad: (path, options) =>
    set((s) => {
      const remembered = rememberCurrentScroll(s)
      const scrollPos = options?.preserveScroll ? s.scrollPos : scrollForPath(s, path, remembered)
      const scrollPositions = options?.preserveScroll
        ? { ...remembered, [path]: scrollPos }
        : remembered
      const pendingScrollRestore = pendingRestoreForPath(
        s,
        path,
        scrollPos,
        scrollPositions,
        options?.preserveScroll
      )
      return {
        filePath: path,
        content: null,
        error: null,
        isFileLoading: true,
        collapsedTocIds: new Set(),
        scrollPos,
        scrollPositions,
        pendingScrollRestore,
      }
    }),

  // Just display the file — history was already updated by goBack/goForward
  loadFile: (path, content) =>
    set((s) => {
      const scrollPositions = rememberCurrentScroll(s)
      const scrollPos = scrollForPath(s, path, scrollPositions)
      return {
        filePath: path,
        content,
        error: null,
        isFileLoading: false,
        collapsedTocIds: new Set(),
        scrollPos,
        scrollPositions,
        pendingScrollRestore: pendingRestoreForPath(s, path, scrollPos, scrollPositions),
      }
    }),

  setToc: (toc) => set({ toc }),
  toggleTocCollapse: (id) =>
    set((s) => {
      const next = new Set(s.collapsedTocIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { collapsedTocIds: next }
    }),
  setScrollPos: (scrollPos) =>
    set((s) => {
      if (s.isFileLoading || s.pendingScrollRestore) return s
      return {
        scrollPos,
        scrollPositions: s.filePath
          ? { ...s.scrollPositions, [s.filePath]: scrollPos }
          : s.scrollPositions,
      }
    }),
  setScrollPositions: (scrollPositions) =>
    set({ scrollPositions: { ...scrollPositions } }),
  completeScrollRestore: (path) =>
    set((s) => {
      if (s.pendingScrollRestore?.path !== path) return s
      return { pendingScrollRestore: null }
    }),
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
    set({
      filePath: null,
      content: null,
      toc: [],
      collapsedTocIds: new Set(),
      isFileLoading: false,
      scrollPos: 0,
      scrollPositions: {},
      pendingScrollRestore: null,
      history: [],
      historyIndex: -1,
      error: null,
    }),
}))
