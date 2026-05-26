import type { FileNode } from '../types'

export interface FlatNode {
  node: FileNode
  depth: number
}

export function flattenTree(
  nodes: FileNode[],
  expandedDirs: Set<string>,
  depth = 0
): FlatNode[] {
  const result: FlatNode[] = []
  for (const node of nodes) {
    result.push({ node, depth })
    if (node.isDir && expandedDirs.has(node.path) && node.children) {
      result.push(...flattenTree(node.children, expandedDirs, depth + 1))
    }
  }
  return result
}
