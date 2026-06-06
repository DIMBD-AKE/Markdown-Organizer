import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useCallback, useEffect, useMemo } from 'react'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import { useViewerStore } from '../../stores/viewerStore'
import { useUiStore } from '../../stores/uiStore'
import { flattenTree } from '../../utils/flattenTree'
import { sortTree } from '../../utils/sortTree'
import { groupTree } from '../../utils/groupTree'
import StatusDot from './StatusDot'
import type { FileNode } from '../../types'

function FolderSpinner() {
  return (
    <svg
      className="animate-spin h-3 w-3 text-overlay0 flex-shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12" cy="12" r="9"
        stroke="currentColor" strokeWidth="3" fill="none"
        strokeLinecap="round"
        strokeDasharray="36"
        strokeDashoffset="18"
      />
    </svg>
  )
}

export default function FileTree() {
  const toggleDir = useFileTreeStore((s) => s.toggleDir)
  const setSelectedFile = useFileTreeStore((s) => s.setSelectedFile)
  const tree = useFileTreeStore((s) => s.tree)
  const expandedDirs = useFileTreeStore((s) => s.expandedDirs)
  const loadingDirs = useFileTreeStore((s) => s.loadingDirs)
  const isStreaming = useFileTreeStore((s) => s.isStreaming)
  const selectedFile = useFileTreeStore((s) => s.selectedFile)
  const setFile = useViewerStore((s) => s.setFile)
  const setError = useViewerStore((s) => s.setError)
  const sortField = useUiStore((s) => s.sortField)
  const sortOrder = useUiStore((s) => s.sortOrder)
  const virtualGrouping = useUiStore((s) => s.virtualGrouping)
  const parentRef = useRef<HTMLDivElement>(null)

  // NOTE: mountedRef removed intentionally.
  // React StrictMode (dev) runs effect cleanup before re-mount, leaving the ref
  // permanently false and silently blocking setFile after every click.
  // Calling Zustand setFile/setError after unmount is safe — pure in-memory update.

  const arranged = useMemo(() => {
    const rootChildren = tree?.children ?? []
    return virtualGrouping
      ? groupTree(rootChildren, tree?.path ?? '', sortField, sortOrder)
      : sortTree(rootChildren, sortField, sortOrder)
  }, [tree, virtualGrouping, sortField, sortOrder])
  const items = tree ? flattenTree(arranged, expandedDirs) : []

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28
  })

  useEffect(() => {
    if (!selectedFile) return
    const idx = items.findIndex(({ node }) => node.path === selectedFile)
    if (idx === -1) return
    virtualizer.scrollToIndex(idx, { align: 'auto' })
  }, [selectedFile]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = useCallback(async (node: FileNode) => {
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
  }, [toggleDir, setSelectedFile, setFile, setError])

  if (items.length === 0) {
    if (isStreaming) {
      return (
        <div className="flex-1 flex items-center justify-center gap-2 p-4">
          <FolderSpinner />
          <span className="text-xs text-overlay0">파일 트리 로딩 중…</span>
        </div>
      )
    }
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
          const isSelected = node.path === selectedFile
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
                <span className="text-overlay0 w-3 text-center flex-shrink-0 text-[13px]">
                  {expandedDirs.has(node.path) ? '▾' : '▸'}
                </span>
              )}
              <span className="truncate flex-1">
                {node.isDir ? node.name : node.name.replace(/\.md$/, '')}
              </span>
              {node.isDir && loadingDirs.has(node.path) && <FolderSpinner />}
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
