import type { FileNode } from '../types'

export type SortField = 'name' | 'date'
export type SortOrder = 'asc' | 'desc'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function compare(a: FileNode, b: FileNode, field: SortField): number {
  if (field === 'date') return a.modifiedAt - b.modifiedAt
  return collator.compare(a.name, b.name)
}

/**
 * Recursively sort a file tree. Folders are always grouped before files
 * (dirs-first); within each group nodes sort by `field` in `order`.
 * Natural (numeric) collation for names: "a2" < "a10". Pure / immutable.
 */
export function sortTree(nodes: FileNode[], field: SortField, order: SortOrder): FileNode[] {
  const dirs: FileNode[] = []
  const files: FileNode[] = []
  for (const n of nodes) {
    ;(n.isDir ? dirs : files).push(
      n.isDir && n.children ? { ...n, children: sortTree(n.children, field, order) } : n
    )
  }
  const dir = order === 'desc' ? -1 : 1
  const cmp = (a: FileNode, b: FileNode): number => dir * compare(a, b, field)
  dirs.sort(cmp)
  files.sort(cmp)
  return [...dirs, ...files]
}
