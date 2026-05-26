import { useViewerStore } from '../../stores/viewerStore'
import { getFreshness, formatAge } from '../../utils/freshness'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import type { Freshness } from '../../types'
import path from 'path'

// Uses CSS-variable-backed Tailwind colors — switches correctly in all themes.
// Latte: green=#40a02b, yellow=#df8e1d, red=#d20f39 (all high contrast on light bg)
const BADGE: Record<Freshness, string> = {
  fresh: 'text-green  border-green  bg-green/10',
  warn:  'text-yellow border-yellow bg-yellow/10',
  stale: 'text-red    border-red    bg-red/10',
}

export default function DocHeader() {
  const { filePath, history, historyIndex, goBack, goForward } = useViewerStore()
  const { tree } = useFileTreeStore()

  if (!filePath) return null

  const fileName = path.basename(filePath)
  const modifiedAt = findModifiedAt(tree, filePath) ?? Date.now()
  const freshness = getFreshness(modifiedAt)

  async function navigate(getPath: () => string | null) {
    const p = getPath()
    if (!p) return
    const { content, error } = await window.api.readFile(p)
    if (content) useViewerStore.getState().setFile(p, content)
    else useViewerStore.getState().setError(error ?? '읽기 실패')
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-surface0 bg-mantle flex-shrink-0">
      <button
        disabled={historyIndex <= 0}
        onClick={() => navigate(goBack)}
        className="text-overlay0 hover:text-text disabled:opacity-30 text-sm px-1 transition-colors"
      >←</button>
      <button
        disabled={historyIndex >= history.length - 1}
        onClick={() => navigate(goForward)}
        className="text-overlay0 hover:text-text disabled:opacity-30 text-sm px-1 transition-colors"
      >→</button>
      <span className="text-sm text-text font-medium truncate flex-1">{fileName}</span>
      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono flex-shrink-0 ${BADGE[freshness]}`}>
        {formatAge(modifiedAt)}
      </span>
    </div>
  )
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
