import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import { useViewerStore } from '../../stores/viewerStore'
import { flattenTree } from '../../utils/flattenTree'
import StatusDot from './StatusDot'
import type { FileNode } from '../../types'

export default function FileTree() {
  const { tree, expandedDirs, selectedFile, toggleDir, setSelectedFile } = useFileTreeStore()
  const { setFile, setError } = useViewerStore()
  const parentRef = useRef<HTMLDivElement>(null)

  const items = tree ? flattenTree(tree.children ?? [], expandedDirs) : []

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26
  })

  async function handleClick(node: FileNode) {
    if (node.isDir) {
      toggleDir(node.path)
      return
    }
    setSelectedFile(node.path)
    try {
      const { content, error } = await window.api.readFile(node.path)
      if (error || content === null) {
        setError(error ?? '파일을 읽을 수 없습니다')
        return
      }
      setFile(node.path, content)
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일을 읽을 수 없습니다')
    }
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize() }} className="relative">
        {virtualizer.getVirtualItems().map((vi) => {
          const { node, depth } = items[vi.index]
          const isSelected = node.path === selectedFile
          return (
            <div
              key={node.path}
              style={{ transform: `translateY(${vi.start}px)`, paddingLeft: `${depth * 12 + 8}px` }}
              className={`
                absolute top-0 left-0 right-0 h-6.5 flex items-center gap-1.5 pr-2 cursor-pointer
                text-xs rounded-sm mx-1
                ${isSelected ? 'bg-surface0 text-text' : 'text-subtext0 hover:bg-surface0/40 hover:text-text'}
              `}
              onClick={() => handleClick(node)}
            >
              {node.isDir && (
                <span className="text-overlay0 w-3 text-center">
                  {expandedDirs.has(node.path) ? '▾' : '▸'}
                </span>
              )}
              <span className="truncate flex-1">
                {node.isDir ? node.name : node.name.replace(/\.md$/, '')}
              </span>
              {node.isDir && node.mdCount !== undefined && (
                <span className="text-overlay0 text-xs">{node.mdCount}</span>
              )}
              {!node.isDir && <StatusDot modifiedAt={node.modifiedAt} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
