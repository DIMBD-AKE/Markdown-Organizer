import { useViewerStore } from '../../stores/viewerStore'
import { useSearchStore } from '../../stores/searchStore'
import DocHeader from './DocHeader'
import MarkdownRenderer from './MarkdownRenderer'
import ErrorBoundary from '../ErrorBoundary'
import React, { useEffect } from 'react'

interface Props { scrollRef: React.RefObject<HTMLDivElement | null> }

/** Saved-scroll restore must yield to a search-driven open: when the file being
 *  opened is the active search target with a live query, MarkdownRenderer scrolls
 *  to the match, so restoring the persisted scrollPos here would clobber that jump. */
export function shouldRestoreScroll(
  filePath: string | null,
  searchActiveFilePath: string | null,
  searchQuery: string
): boolean {
  if (searchActiveFilePath === filePath && searchQuery.trim()) return false
  return true
}

export default function DocumentViewer({ scrollRef }: Props) {
  // Use individual selectors — calling useViewerStore() with no selector subscribes
  // to ALL state changes (including scrollPos every scroll event), causing a
  // full re-render cascade into MarkdownRenderer → MermaidDiagram/CodeBlock → state reset.
  const filePath = useViewerStore((s) => s.filePath)
  const content = useViewerStore((s) => s.content)
  const error = useViewerStore((s) => s.error)
  const isFileLoading = useViewerStore((s) => s.isFileLoading)
  const setScrollPos = useViewerStore((s) => s.setScrollPos)

  useEffect(() => {
    if (!scrollRef.current) return
    const search = useSearchStore.getState()
    if (!shouldRestoreScroll(filePath, search.activeFilePath, search.query)) return
    scrollRef.current.scrollTop = useViewerStore.getState().scrollPos
  }, [filePath])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    setScrollPos((e.target as HTMLDivElement).scrollTop)
  }

  if (!filePath) {
    return <div className="flex-1 flex items-center justify-center text-overlay0 text-sm">파일을 선택하세요</div>
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <DocHeader />
      <div ref={scrollRef as React.RefObject<HTMLDivElement>} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-base select-text">
        {error
          ? <div className="p-8 text-red text-sm">{error}</div>
          : content
          ? (
            <ErrorBoundary key={filePath} fallback={<div className="p-8 text-red text-sm">렌더링 오류</div>}>
              <MarkdownRenderer content={content} filePath={filePath} />
            </ErrorBoundary>
          )
          : isFileLoading && (
            <div className="flex items-center justify-center gap-2 p-8 text-overlay0 text-sm">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none"
                  strokeLinecap="round" strokeDasharray="36" strokeDashoffset="18" />
              </svg>
              불러오는 중…
            </div>
          )
        }
      </div>
    </div>
  )
}
