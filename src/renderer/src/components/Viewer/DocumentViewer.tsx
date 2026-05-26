import { useViewerStore } from '../../stores/viewerStore'
import DocHeader from './DocHeader'
import MarkdownRenderer from './MarkdownRenderer'
import ErrorBoundary from '../ErrorBoundary'
import { useEffect, useRef } from 'react'

export default function DocumentViewer() {
  const { filePath, content, error, scrollPos, setScrollPos } = useViewerStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollPos
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
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-base">
        {error
          ? <div className="p-8 text-red text-sm">{error}</div>
          : content && (
            <ErrorBoundary fallback={<div className="p-8 text-red text-sm">렌더링 오류</div>}>
              <MarkdownRenderer content={content} filePath={filePath} />
            </ErrorBoundary>
          )
        }
      </div>
    </div>
  )
}
