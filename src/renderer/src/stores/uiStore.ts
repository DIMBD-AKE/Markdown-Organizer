import { create } from 'zustand'

import type { SortField, SortOrder } from '../utils/sortTree'

export type SidebarTab = 'files' | 'search' | 'settings'
export type Theme = 'dark' | 'black' | 'latte' | 'claude' | 'codex'

const DEFAULT_FILE_TREE_WIDTH = 220
const DEFAULT_TOC_WIDTH = 200

interface UiStore {
  theme: Theme
  sidebarTab: SidebarTab
  fileTreeWidth: number
  tocWidth: number
  isFileTreeCollapsed: boolean
  isTocCollapsed: boolean
  sortField: SortField
  sortOrder: SortOrder
  virtualGrouping: boolean
  setTheme(theme: Theme): void
  setSidebarTab(tab: SidebarTab): void
  setFileTreeWidth(w: number): void
  setTocWidth(w: number): void
  toggleFileTree(): void
  toggleToc(): void
  setSortField(f: SortField): void
  setSortOrder(o: SortOrder): void
  setVirtualGrouping(v: boolean): void
  toggleVirtualGrouping(): void
}

export const useUiStore = create<UiStore>((set) => ({
  theme: 'dark',
  sidebarTab: 'files',
  fileTreeWidth: DEFAULT_FILE_TREE_WIDTH,
  tocWidth: DEFAULT_TOC_WIDTH,
  isFileTreeCollapsed: false,
  isTocCollapsed: false,
  sortField: 'name',
  sortOrder: 'asc',
  virtualGrouping: false,
  setTheme: (theme) => set({ theme }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  setFileTreeWidth: (fileTreeWidth) => set({ fileTreeWidth }),
  setTocWidth: (tocWidth) => set({ tocWidth }),
  toggleFileTree: () => set((s) => ({ isFileTreeCollapsed: !s.isFileTreeCollapsed })),
  toggleToc: () => set((s) => ({ isTocCollapsed: !s.isTocCollapsed })),
  setSortField: (sortField) => set({ sortField }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setVirtualGrouping: (virtualGrouping) => set({ virtualGrouping }),
  toggleVirtualGrouping: () => set((s) => ({ virtualGrouping: !s.virtualGrouping }))
}))
