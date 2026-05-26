import { create } from 'zustand'

interface UiStore {
  theme: 'dark' | 'black'
  fileTreeWidth: number
  tocWidth: number
  isFileTreeCollapsed: boolean
  isTocCollapsed: boolean
  setTheme(theme: 'dark' | 'black'): void
  setFileTreeWidth(w: number): void
  setTocWidth(w: number): void
  toggleFileTree(): void
  toggleToc(): void
}

export const useUiStore = create<UiStore>((set) => ({
  theme: 'dark',
  fileTreeWidth: 220,
  tocWidth: 200,
  isFileTreeCollapsed: false,
  isTocCollapsed: false,
  setTheme: (theme) => set({ theme }),
  setFileTreeWidth: (fileTreeWidth) => set({ fileTreeWidth }),
  setTocWidth: (tocWidth) => set({ tocWidth }),
  toggleFileTree: () => set((s) => ({ isFileTreeCollapsed: !s.isFileTreeCollapsed })),
  toggleToc: () => set((s) => ({ isTocCollapsed: !s.isTocCollapsed }))
}))
