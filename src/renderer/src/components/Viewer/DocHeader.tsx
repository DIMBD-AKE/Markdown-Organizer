import { useViewerStore } from '../../stores/viewerStore'
import { getFreshness, getFreshnessColor, formatAge } from '../../utils/freshness'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import path from 'path'

export default function DocHeader() {
  const { filePath, history, historyIndex, goBack, goForward } = useViewerStore()
  const { tree } = useFileTreeStore()

  if (!filePath) return null

  const fileName = path.basename(filePath)
  const modifiedAt = findModifiedAt(tree, filePath) ?? Date.now()
  const freshness = getFreshness(modifiedAt)
  const color = getFreshnessColor(freshness)

  async function navigate(getPath: () => string | null) {
    const p = getPath()
    if (!p) return
    const { content, error } = await window.api.readFile(p)
    if (content) useViewerStore.getState().setFile(p, content)
    else useViewerStore.getState().setError(error ?? '읽기 실패')
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-surface0 bg-mantle">
      <button
        disabled={historyIndex <= 0}
        onClick={() => navigate(goBack)}
        className="text-overlay0 hover:text-text disabled:opacity-30 text-sm px-1"
      >←</button>
      <button
        disabled={historyIndex >= history.length - 1}
        onClick={() => navigate(goForward)}
        className="text-overlay0 hover:text-text disabled:opacity-30 text-sm px-1"
      >→</button>
      <span className="text-sm text-text font-medium truncate flex-1">{fileName}</span>
      <span className="text-xs px-2 py-0.5 rounded-full border" style={{ color, borderColor: color }}>
        {formatAge(modifiedAt)}
      </span>
    </div>
  )
}

function findModifiedAt(node: import('../../types').FileNode | null, targetPath: string): number | undefined {
  if (!node) return undefined
  if (node.path === targetPath) return node.modifiedAt
  for (const child of node.children ?? []) {
    const found = findModifiedAt(child, targetPath)
    if (found !== undefined) return found
  }
  return undefined
}
