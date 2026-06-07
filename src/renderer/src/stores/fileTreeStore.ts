import { create } from 'zustand'
import type { FileNode } from '../types'

interface FileTreeStore {
  tree: FileNode | null
  expandedDirs: Set<string>
  /** Folder paths currently waiting for their children to stream in. */
  loadingDirs: Set<string>
  selectedFile: string | null
  /** Legacy boolean — kept for compat with non-streaming code paths. */
  isLoading: boolean
  /** True between startStream and completeStream. UI uses this for the
   *  per-folder spinner state. */
  isStreaming: boolean

  setTree(tree: FileNode | null): void
  setSelectedFile(path: string | null): void
  toggleDir(path: string): void
  setExpandedDirs(paths: string[]): void
  expandDirs(paths: string[]): void
  setLoading(isLoading: boolean): void

  // Streaming actions ─────────────────────────────────────────────
  /** Initialize with a root-only node. All children arrive via applyStreamNode. */
  startStream(rootNode: FileNode): void
  /** Patch the tree: set `parentPath`'s children, mark child folders as loading. */
  applyStreamNode(parentPath: string, children: FileNode[]): void
  /** Batched form of applyStreamNode: apply many parent patches in ONE state
   *  update. Caller coalesces rapid FILE_TREE_NODE events to avoid one React
   *  render per directory (which starves the rest of the UI during big scans). */
  applyStreamNodes(patches: { parentPath: string; children: FileNode[] }[]): void
  /** All folders streamed. Clear loadingDirs, drop isStreaming. */
  completeStream(): void
}

/** Recursively count markdown files (files with isDir=false) in a subtree. */
function recursiveMdCount(node: FileNode): number {
  if (!node.isDir) return 1
  if (!node.children) return 0
  return node.children.reduce((acc, c) => acc + recursiveMdCount(c), 0)
}

/**
 * Recursively remove directories that contain no markdown descendants.
 * Recomputes `mdCount` (recursive) for every surviving directory. Root is
 * never removed even when its children all prune away — caller decides what
 * to render when the root is empty.
 */
function pruneEmptyDirs(root: FileNode): FileNode {
  if (!root.isDir) return root
  const children = root.children ?? []
  const survivors: FileNode[] = []
  for (const c of children) {
    if (!c.isDir) {
      survivors.push(c)
      continue
    }
    const prunedChild = pruneEmptyDirs(c)
    if (recursiveMdCount(prunedChild) > 0) survivors.push(prunedChild)
  }
  const mdCount = survivors.reduce((acc, c) => acc + recursiveMdCount(c), 0)
  return { ...root, children: survivors, mdCount }
}

/** Immutable patch: set children of node at `targetPath` inside `root`. */
function patchChildren(root: FileNode, targetPath: string, children: FileNode[]): FileNode {
  if (root.path === targetPath) {
    // Count direct .md files for the badge — approximate, not recursive
    // (recursive count not reliable during streaming; renderer can display
    //  the count even if it grows as deeper subdirs arrive).
    const mdCount = children.filter((c) => !c.isDir).length
    return { ...root, children, mdCount }
  }
  if (!root.children || root.children.length === 0) return root
  let mutated = false
  const newChildren = root.children.map((c) => {
    if (!c.isDir) return c
    const updated = patchChildren(c, targetPath, children)
    if (updated !== c) mutated = true
    return updated
  })
  if (!mutated) return root
  return { ...root, children: newChildren }
}

export const useFileTreeStore = create<FileTreeStore>((set) => ({
  tree: null,
  expandedDirs: new Set(),
  loadingDirs: new Set(),
  selectedFile: null,
  isLoading: false,
  isStreaming: false,

  setTree: (tree) => set({ tree, loadingDirs: new Set(), isStreaming: false }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  toggleDir: (path) =>
    set((s) => {
      const next = new Set(s.expandedDirs)
      next.has(path) ? next.delete(path) : next.add(path)
      return { expandedDirs: next }
    }),
  setExpandedDirs: (paths) => set({ expandedDirs: new Set(paths) }),
  expandDirs: (paths) =>
    set((s) => {
      const next = new Set(s.expandedDirs)
      paths.forEach((p) => next.add(p))
      return { expandedDirs: next }
    }),
  setLoading: (isLoading) => set({ isLoading }),

  startStream: (rootNode) =>
    set({
      tree: rootNode,
      loadingDirs: new Set([rootNode.path]),
      isStreaming: true,
      isLoading: false,
    }),

  applyStreamNode: (parentPath, children) =>
    set((s) => {
      if (!s.tree) return {}
      const newTree = patchChildren(s.tree, parentPath, children)
      if (newTree === s.tree && parentPath !== s.tree.path) {
        // Parent not found in tree — unknown subtree, ignore
        return {}
      }
      const nextLoading = new Set(s.loadingDirs)
      nextLoading.delete(parentPath)
      for (const c of children) {
        if (c.isDir) nextLoading.add(c.path)
      }
      return { tree: newTree, loadingDirs: nextLoading }
    }),

  applyStreamNodes: (patches) =>
    set((s) => {
      if (!s.tree || patches.length === 0) return {}
      let tree = s.tree
      const nextLoading = new Set(s.loadingDirs)
      for (const { parentPath, children } of patches) {
        const patched = patchChildren(tree, parentPath, children)
        if (patched === tree && parentPath !== tree.path) continue // unknown subtree
        tree = patched
        nextLoading.delete(parentPath)
        for (const c of children) {
          if (c.isDir) nextLoading.add(c.path)
        }
      }
      if (tree === s.tree) return {}
      return { tree, loadingDirs: nextLoading }
    }),

  completeStream: () =>
    set((s) => ({
      tree: s.tree ? pruneEmptyDirs(s.tree) : null,
      loadingDirs: new Set(),
      isStreaming: false,
    })),
}))

// Exposed for tests
export const __test = { patchChildren, pruneEmptyDirs }
