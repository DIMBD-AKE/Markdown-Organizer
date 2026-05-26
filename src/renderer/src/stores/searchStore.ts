import { create } from 'zustand'
import type { SearchMatch, SearchResult } from '../types'

interface SearchStore {
  query: string
  mode: 'string' | 'regex'
  scope: 'current' | 'all'
  results: SearchResult[]
  isSearching: boolean
  error: string | null
  // in-viewer highlight state
  activeFilePath: string | null
  activeMatchIndex: number // current match index in viewer (0-based)
  activeFileMatches: SearchMatch[] // all matches for currently open file
  totalMatchCount: number // DOM-discovered match count (set by MarkdownRenderer after render)

  setQuery(q: string): void
  setMode(m: 'string' | 'regex'): void
  setScope(s: 'current' | 'all'): void
  setResults(r: SearchResult[]): void
  setSearching(b: boolean): void
  setError(e: string | null): void
  setActiveFile(filePath: string, matches: SearchMatch[]): void
  setActiveMatchIndex(i: number): void
  setTotalMatchCount(n: number): void
  clearSearch(): void
}

export const useSearchStore = create<SearchStore>((set) => ({
  query: '',
  mode: 'string',
  scope: 'current',
  results: [],
  isSearching: false,
  error: null,
  activeFilePath: null,
  activeMatchIndex: 0,
  activeFileMatches: [],
  totalMatchCount: 0,

  setQuery: (query) => set({ query }),
  setMode: (mode) => set({ mode }),
  setScope: (scope) => set({ scope }),
  setResults: (results) => set({ results }),
  setSearching: (isSearching) => set({ isSearching }),
  setError: (error) => set({ error }),
  setActiveFile: (activeFilePath, activeFileMatches) =>
    set({ activeFilePath, activeFileMatches, activeMatchIndex: 0 }),
  setActiveMatchIndex: (activeMatchIndex) => set({ activeMatchIndex }),
  setTotalMatchCount: (totalMatchCount) => set({ totalMatchCount }),
  clearSearch: () =>
    set({
      query: '',
      results: [],
      error: null,
      activeFilePath: null,
      activeMatchIndex: 0,
      activeFileMatches: [],
      totalMatchCount: 0,
      // Keep mode and scope as user preferences
    }),
}))
