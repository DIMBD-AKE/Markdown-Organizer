import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useCallback, useEffect } from 'react'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import { useViewerStore } from '../../stores/viewerStore'
import { flattenTree } from '../../utils/flattenTree'
import StatusDot from './StatusDot'
import type { FileNode } from '../../types'

export default function FileTree() {
  const toggleDir = useFileTreeStore((s) => s.toggleDir)
  const setSelectedFile = useFileTreeStore((s) => s.setSelectedFile)
  const tree = useFileTreeStore((s) => s.tree)
  const expandedDirs = useFileTreeStore((s) => s.expandedDirs)
  const selectedFile = useFileTreeStore((s) => s.selectedFile)
  const setFile = useViewerStore((s) => s.setFile)
  const setError = useViewerStore((s) => s.setError)
  const parentRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  useEffect(() => () => { mountedRef.current = false }, [])

  const items = tree ? flattenTree(tree.children ?? [], expandedDirs) : []

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28
  })

  const handleClick = useCallback(async (node: FileNode) => {
    if (node.isDir) {
      toggleDir(node.path)
      return
    }
    setSelectedFile(node.path)
    try {
      const { content, error } = await window.api.readFile(node.path)
      if (!mountedRef.current) return
      if (error || content === null) {
        setError(error ?? '파일을 읽을 수 없습니다')
        return
      }
      setFile(node.path, content)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : '파일을 읽을 수 없습니다')
    }
  }, [toggleDir, setSelectedFile, setFile, setError])

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <span className="text-xs text-overlay0 text-center">마크다운 파일이 없습니다</span>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize() }} className="relative">
        {virtualizer.getVirtualItems().map((vi) => {
          const { node, depth } = items[vi.index]
          const isSelected = !node.isDir && node.path === selectedFile
          return (
            <div
              key={node.path}
              style={{
                transform: `translateY(${vi.start}px)`,
                paddingLeft: `${depth * 12 + 10}px`
              }}
              className={`
                absolute top-0 left-0 right-0 h-7 flex items-center gap-1.5 pr-2
                cursor-pointer text-xs border-l-2 transition-colors
                ${isSelected
                  ? 'border-amber bg-[var(--color-amber-soft)] text-text'
                  : 'border-transparent text-subtext0 hover:bg-surface0/40 hover:text-text'
                }
              `}
              onClick={() => handleClick(node)}
            >
              {node.isDir && (
                <span className="text-overlay0 w-3 text-center flex-shrink-0 text-[10px]">
                  {expandedDirs.has(node.path) ? '▾' : '▸'}
                </span>
              )}
              <span className="truncate flex-1">
                {node.isDir ? node.name : node.name.replace(/\.md$/, '')}
              </span>
              {node.isDir && node.mdCount !== undefined && (
                <span className="text-overlay0 text-[10px] flex-shrink-0">{node.mdCount}</span>
              )}
              {!node.isDir && <StatusDot modifiedAt={node.modifiedAt} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
