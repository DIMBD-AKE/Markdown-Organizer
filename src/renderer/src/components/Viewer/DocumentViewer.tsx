import { useViewerStore } from '../../stores/viewerStore'
import DocHeader from './DocHeader'
import MarkdownRenderer from './MarkdownRenderer'
import ErrorBoundary from '../ErrorBoundary'
import React, { useEffect } from 'react'

interface Props { scrollRef: React.RefObject<HTMLDivElement | null> }

export default function DocumentViewer({ scrollRef }: Props) {
  // Use individual selectors — calling useViewerStore() with no selector subscribes
  // to ALL state changes (including scrollPos every scroll event), causing a
  // full re-render cascade into MarkdownRenderer → MermaidDiagram/CodeBlock → state reset.
  const filePath = useViewerStore((s) => s.filePath)
  const content = useViewerStore((s) => s.content)
  const error = useViewerStore((s) => s.error)
  const setScrollPos = useViewerStore((s) => s.setScrollPos)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = useViewerStore.getState().scrollPos
    }
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
          : content && (
            <ErrorBoundary key={filePath} fallback={<div className="p-8 text-red text-sm">렌더링 오류</div>}>
              <MarkdownRenderer content={content} filePath={filePath} />
            </ErrorBoundary>
          )
        }
      </div>
    </div>
  )
}
