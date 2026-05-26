import { useViewerStore } from '../../stores/viewerStore'
import { getFreshness, formatAge } from '../../utils/freshness'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import { useSearchStore } from '../../stores/searchStore'
import type { Freshness } from '../../types'
import path from 'path'

const BADGE: Record<Freshness, string> = {
  fresh: 'text-green  border-green  bg-green/10',
  warn:  'text-yellow border-yellow bg-yellow/10',
  stale: 'text-red    border-red    bg-red/10',
}

export default function DocHeader() {
  const filePath      = useViewerStore((s) => s.filePath)
  const history       = useViewerStore((s) => s.history)
  const historyIndex  = useViewerStore((s) => s.historyIndex)
  const goBack        = useViewerStore((s) => s.goBack)
  const goForward     = useViewerStore((s) => s.goForward)

  const tree = useFileTreeStore((s) => s.tree)

  const activeFilePath    = useSearchStore((s) => s.activeFilePath)
  const activeMatchIndex  = useSearchStore((s) => s.activeMatchIndex)
  const totalMatchCount   = useSearchStore((s) => s.totalMatchCount)
  const setActiveMatchIndex = useSearchStore((s) => s.setActiveMatchIndex)
  const clearSearch       = useSearchStore((s) => s.clearSearch)

  if (!filePath) return null

  const fileName = path.basename(filePath)
  const modifiedAt = findModifiedAt(tree, filePath) ?? Date.now()
  const freshness = getFreshness(modifiedAt)

  const canGoBack    = historyIndex > 0
  const canGoForward = historyIndex < history.length - 1

  const isSearchActive = activeFilePath === filePath && totalMatchCount > 0

  /**
   * Navigate back or forward.
   * goBack()/goForward() already update historyIndex and return the target path.
   * We use loadFile (not setFile) so history is not re-appended.
   */
  async function navigate(getPath: () => string | null) {
    const p = getPath()
    if (!p) return
    try {
      const { content, error } = await window.api.readFile(p)
      if (content) {
        useViewerStore.getState().loadFile(p, content)
        const { tree, setSelectedFile, expandDirs } = useFileTreeStore.getState()
        setSelectedFile(p)
        if (tree) expandDirs(ancestorDirs(p, tree.path))
      } else {
        // On error the historyIndex was already moved — move it back to be safe
        useViewerStore.getState().setError(error ?? '읽기 실패')
      }
    } catch (err) {
      useViewerStore.getState().setError(err instanceof Error ? err.message : '읽기 실패')
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-surface0 bg-mantle flex-shrink-0">
      <button
        disabled={!canGoBack}
        onClick={() => navigate(goBack)}
        title="뒤로"
        className="text-overlay0 hover:text-text disabled:opacity-30 disabled:cursor-not-allowed
          text-sm px-1 transition-colors"
      >←</button>
      <button
        disabled={!canGoForward}
        onClick={() => navigate(goForward)}
        title="앞으로"
        className="text-overlay0 hover:text-text disabled:opacity-30 disabled:cursor-not-allowed
          text-sm px-1 transition-colors"
      >→</button>
      <span className="text-sm text-text font-medium truncate flex-1">{fileName}</span>
      {isSearchActive && (
        <>
          <span className="text-xs text-overlay0 font-mono flex-shrink-0">
            {activeMatchIndex + 1}/{totalMatchCount}
          </span>
          <button
            disabled={activeMatchIndex <= 0}
            onClick={() => setActiveMatchIndex(activeMatchIndex - 1)}
            title="이전 검색 결과"
            className="text-overlay0 hover:text-text disabled:opacity-30 disabled:cursor-not-allowed text-sm px-1 transition-colors"
          >↑</button>
          <button
            disabled={activeMatchIndex >= totalMatchCount - 1}
            onClick={() => setActiveMatchIndex(activeMatchIndex + 1)}
            title="다음 검색 결과"
            className="text-overlay0 hover:text-text disabled:opacity-30 disabled:cursor-not-allowed text-sm px-1 transition-colors"
          >↓</button>
          <button
            onClick={clearSearch}
            title="검색 초기화"
            className="text-overlay0 hover:text-red text-sm px-1 transition-colors flex-shrink-0"
          >×</button>
        </>
      )}
      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono flex-shrink-0 ${BADGE[freshness]}`}>
        {formatAge(modifiedAt)}
      </span>
    </div>
  )
}

function ancestorDirs(filePath: string, rootPath: string): string[] {
  const dirs: string[] = []
  let current = path.dirname(filePath)
  while (current !== rootPath && current !== path.dirname(current)) {
    dirs.push(current)
    current = path.dirname(current)
  }
  return dirs
}

function findModifiedAt(
  node: import('../../types').FileNode | null,
  targetPath: string
): number | undefined {
  if (!node) return undefined
  if (node.path === targetPath) return node.modifiedAt
  for (const child of node.children ?? []) {
    const found = findModifiedAt(child, targetPath)
    if (found !== undefined) return found
  }
  return undefined
}
