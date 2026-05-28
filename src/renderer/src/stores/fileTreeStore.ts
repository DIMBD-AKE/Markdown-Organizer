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
  /** All folders streamed. Clear loadingDirs, drop isStreaming. */
  completeStream(): void
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

  completeStream: () =>
    set({
      loadingDirs: new Set(),
      isStreaming: false,
    }),
}))

// Exposed for tests
export const __test = { patchChildren }
