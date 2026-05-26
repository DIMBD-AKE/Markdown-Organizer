import { create } from 'zustand'

export type SidebarTab = 'files' | 'search' | 'settings'

const DEFAULT_FILE_TREE_WIDTH = 220
const DEFAULT_TOC_WIDTH = 200

interface UiStore {
  theme: 'dark' | 'black' | 'latte'
  sidebarTab: SidebarTab
  fileTreeWidth: number
  tocWidth: number
  isFileTreeCollapsed: boolean
  isTocCollapsed: boolean
  setTheme(theme: 'dark' | 'black' | 'latte'): void
  setSidebarTab(tab: SidebarTab): void
  setFileTreeWidth(w: number): void
  setTocWidth(w: number): void
  toggleFileTree(): void
  toggleToc(): void
}

export const useUiStore = create<UiStore>((set) => ({
  theme: 'dark',
  sidebarTab: 'files',
  fileTreeWidth: DEFAULT_FILE_TREE_WIDTH,
  tocWidth: DEFAULT_TOC_WIDTH,
  isFileTreeCollapsed: false,
  isTocCollapsed: false,
  setTheme: (theme) => set({ theme }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  setFileTreeWidth: (fileTreeWidth) => set({ fileTreeWidth }),
  setTocWidth: (tocWidth) => set({ tocWidth }),
  toggleFileTree: () => set((s) => ({ isFileTreeCollapsed: !s.isFileTreeCollapsed })),
  toggleToc: () => set((s) => ({ isTocCollapsed: !s.isTocCollapsed }))
}))
