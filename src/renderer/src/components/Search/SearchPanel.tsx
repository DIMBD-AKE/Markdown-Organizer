import { useEffect, useRef, useCallback } from 'react'
import { useSearchStore } from '../../stores/searchStore'
import { useProjectStore, activeProject } from '../../stores/projectStore'
import { useViewerStore } from '../../stores/viewerStore'
import { useUiStore } from '../../stores/uiStore'
import type { SearchResult } from '../../types'

export default function SearchPanel() {
  const inputRef = useRef<HTMLInputElement>(null)

  // Individual selectors — never destructure the whole store
  const query = useSearchStore((s) => s.query)
  const mode = useSearchStore((s) => s.mode)
  const scope = useSearchStore((s) => s.scope)
  const results = useSearchStore((s) => s.results)
  const isSearching = useSearchStore((s) => s.isSearching)
  const error = useSearchStore((s) => s.error)

  const setQuery = useSearchStore((s) => s.setQuery)
  const setMode = useSearchStore((s) => s.setMode)
  const setScope = useSearchStore((s) => s.setScope)
  const setResults = useSearchStore((s) => s.setResults)
  const setSearching = useSearchStore((s) => s.setSearching)
  const setError = useSearchStore((s) => s.setError)
  const clearSearch = useSearchStore((s) => s.clearSearch)

  const project = useProjectStore(activeProject)
  const projects = useProjectStore((s) => s.projects)

  const sidebarTab = useUiStore((s) => s.sidebarTab)

  // Auto-focus input when this tab becomes active
  useEffect(() => {
    if (sidebarTab === 'search') {
      inputRef.current?.focus()
    }
  }, [sidebarTab])

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setError('검색어를 입력해 주세요.')
      return
    }

    const projectPaths =
      scope === 'current'
        ? project
          ? [project.path]
          : []
        : projects.map((p) => p.path)

    if (projectPaths.length === 0) {
      setError('열린 프로젝트가 없습니다.')
      return
    }

    setSearching(true)
    setError(null)

    try {
      const res = await window.api.searchFiles({ query: trimmed, mode, scope, projectPaths })
      if (res.error) {
        setError(
          mode === 'regex'
            ? '올바르지 않은 정규식 패턴입니다.'
            : res.error
        )
        setResults([])
      } else {
        setResults(res.results)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '검색 중 오류가 발생했습니다.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [query, mode, scope, project, projects, setSearching, setError, setResults])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleResultClick = async (result: SearchResult) => {
    const { content, error: fileError } = await window.api.readFile(result.filePath)
    if (content !== null) {
      useViewerStore.getState().setFile(result.filePath, content)
      useSearchStore.getState().setActiveFile(result.filePath, result.matches)
    } else {
      useViewerStore.getState().setError(
        fileError ?? '문서를 불러올 수 없습니다.'
      )
    }
  }

  const showClear = query.length > 0 || results.length > 0

  return (
    <div className="flex flex-col w-full h-full bg-mantle border-r border-surface0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-surface0 flex items-center justify-between">
        <div className="text-[10px] font-semibold text-overlay0 uppercase tracking-widest">
          검색
        </div>
        {showClear && (
          <button
            onClick={clearSearch}
            className="text-overlay0 hover:text-text transition-colors text-xs leading-none"
            title="검색 초기화"
          >
            ×
          </button>
        )}
      </div>

      {/* Search controls */}
      <div className="px-3 py-2.5 space-y-2 border-b border-surface0">
        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="검색어 입력"
          className="w-full bg-base border border-surface0 rounded px-2.5 py-1.5 text-sm text-text placeholder-overlay0 focus:outline-none focus:border-amber"
        />

        {/* Scope radio */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="search-scope"
              value="current"
              checked={scope === 'current'}
              onChange={() => setScope('current')}
              className="accent-amber"
            />
            <span className={`text-xs ${scope === 'current' ? 'text-amber' : 'text-subtext0'}`}>
              현재
            </span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="search-scope"
              value="all"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
              className="accent-amber"
            />
            <span className={`text-xs ${scope === 'all' ? 'text-amber' : 'text-subtext0'}`}>
              전체
            </span>
          </label>
        </div>

        {/* Mode radio */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="search-mode"
              value="string"
              checked={mode === 'string'}
              onChange={() => setMode('string')}
              className="accent-amber"
            />
            <span className={`text-xs ${mode === 'string' ? 'text-amber' : 'text-subtext0'}`}>
              문자열
            </span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="search-mode"
              value="regex"
              checked={mode === 'regex'}
              onChange={() => setMode('regex')}
              className="accent-amber"
            />
            <span className={`text-xs ${mode === 'regex' ? 'text-amber' : 'text-subtext0'}`}>
              Regex
            </span>
          </label>
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="bg-amber text-crust font-medium text-xs px-3 py-1.5 rounded-md w-full disabled:opacity-50 transition-opacity"
        >
          {isSearching ? '검색 중...' : '검색'}
        </button>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto">
        {/* Error state */}
        {error && (
          <div className="px-3 py-3">
            <p className="text-xs text-red">{error}</p>
          </div>
        )}

        {/* Results */}
        {!error && !isSearching && results.length > 0 && (
          <>
            {/* Result count header */}
            <div className="px-3 py-1.5 border-b border-surface0">
              <span className="text-[10px] font-semibold text-overlay0 uppercase tracking-widest">
                결과 {results.length}개
              </span>
            </div>

            {/* Result list */}
            {results.map((result) => (
              <button
                key={result.filePath}
                onClick={() => handleResultClick(result)}
                className="w-full text-left px-3 py-2 cursor-pointer hover:bg-surface0/40 border-b border-surface0/30 transition-colors"
              >
                <div className="text-sm font-medium text-text">{result.fileName}</div>
                <div className="text-[10px] text-overlay0 truncate">{result.filePath}</div>
                {result.matches[0] && (
                  <div className="text-xs text-subtext0 mt-1 line-clamp-2">
                    {result.matches[0].lineText.trim()}
                  </div>
                )}
                <div className="text-[10px] text-amber mt-0.5">{result.matchCount} matches</div>
              </button>
            ))}
          </>
        )}

        {/* Empty state after search */}
        {!error && !isSearching && results.length === 0 && query.trim() && (
          <div className="px-3 py-4 flex items-center justify-center">
            <span className="text-xs text-overlay0">검색 결과가 없습니다.</span>
          </div>
        )}
      </div>
    </div>
  )
}
