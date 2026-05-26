import { create } from 'zustand'

const DEFAULT_FILE_TREE_WIDTH = 220
const DEFAULT_TOC_WIDTH = 200

interface UiStore {
  theme: 'dark' | 'black' | 'latte'
  fileTreeWidth: number
  tocWidth: number
  isFileTreeCollapsed: boolean
  isTocCollapsed: boolean
  setTheme(theme: 'dark' | 'black' | 'latte'): void
  setFileTreeWidth(w: number): void
  setTocWidth(w: number): void
  toggleFileTree(): void
  toggleToc(): void
}

export const useUiStore = create<UiStore>((set) => ({
  theme: 'dark',
  fileTreeWidth: DEFAULT_FILE_TREE_WIDTH,
  tocWidth: DEFAULT_TOC_WIDTH,
  isFileTreeCollapsed: false,
  isTocCollapsed: false,
  setTheme: (theme) => set({ theme }),
  setFileTreeWidth: (fileTreeWidth) => set({ fileTreeWidth }),
  setTocWidth: (tocWidth) => set({ tocWidth }),
  toggleFileTree: () => set((s) => ({ isFileTreeCollapsed: !s.isFileTreeCollapsed })),
  toggleToc: () => set((s) => ({ isTocCollapsed: !s.isTocCollapsed }))
}))
