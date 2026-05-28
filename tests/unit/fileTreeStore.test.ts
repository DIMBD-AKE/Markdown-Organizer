import { describe, it, expect } from 'vitest'
import { __test, useFileTreeStore } from '../../src/renderer/src/stores/fileTreeStore'
import type { FileNode } from '../../src/renderer/src/types'

const { patchChildren, pruneEmptyDirs } = __test

function dir(p: string, name: string, children: FileNode[] = []): FileNode {
  return { name, path: p, isDir: true, modifiedAt: 0, children }
}

function file(p: string, name: string): FileNode {
  return { name, path: p, isDir: false, modifiedAt: 0 }
}

describe('patchChildren', () => {
  it('patches root when targetPath equals root.path', () => {
    const root = dir('/r', 'r', [])
    const children = [file('/r/a.md', 'a.md'), file('/r/b.md', 'b.md')]
    const next = patchChildren(root, '/r', children)
    expect(next.children).toEqual(children)
    expect(next.mdCount).toBe(2)
    // Immutability: original untouched
    expect(root.children).toEqual([])
  })

  it('patches deep nested folder', () => {
    const root = dir('/r', 'r', [
      dir('/r/a', 'a', [
        dir('/r/a/b', 'b', []),
      ]),
    ])
    const newChildren = [file('/r/a/b/deep.md', 'deep.md')]
    const next = patchChildren(root, '/r/a/b', newChildren)
    const a = next.children![0]
    const b = a.children![0]
    expect(b.children).toEqual(newChildren)
    expect(b.mdCount).toBe(1)
    // Parents are new references
    expect(next).not.toBe(root)
    expect(a).not.toBe(root.children![0])
    expect(b).not.toBe(root.children![0].children![0])
  })

  it('returns same root when targetPath not found', () => {
    const root = dir('/r', 'r', [dir('/r/a', 'a', [])])
    const next = patchChildren(root, '/r/non-existent', [])
    expect(next).toBe(root)
  })

  it('only counts direct .md files in mdCount, not nested', () => {
    const root = dir('/r', 'r', [])
    const children = [
      file('/r/a.md', 'a.md'),
      file('/r/b.md', 'b.md'),
      dir('/r/sub', 'sub', []),  // not counted
    ]
    const next = patchChildren(root, '/r', children)
    expect(next.mdCount).toBe(2)
  })

  it('preserves siblings when patching one child', () => {
    const root = dir('/r', 'r', [
      dir('/r/a', 'a', []),
      dir('/r/b', 'b', []),
      dir('/r/c', 'c', []),
    ])
    const newAchildren = [file('/r/a/x.md', 'x.md')]
    const next = patchChildren(root, '/r/a', newAchildren)
    expect(next.children).toHaveLength(3)
    expect(next.children![0].children).toEqual(newAchildren)
    expect(next.children![1]).toBe(root.children![1])  // b untouched, same ref
    expect(next.children![2]).toBe(root.children![2])  // c untouched, same ref
  })
})

describe('pruneEmptyDirs', () => {
  it('removes a single empty directory', () => {
    const root = dir('/r', 'r', [
      dir('/r/empty', 'empty', []),
      file('/r/a.md', 'a.md'),
    ])
    const pruned = pruneEmptyDirs(root)
    expect(pruned.children).toHaveLength(1)
    expect(pruned.children![0].name).toBe('a.md')
  })

  it('keeps directories that contain markdown anywhere below', () => {
    const root = dir('/r', 'r', [
      dir('/r/a', 'a', [
        dir('/r/a/b', 'b', [
          file('/r/a/b/deep.md', 'deep.md'),
        ]),
      ]),
    ])
    const pruned = pruneEmptyDirs(root)
    expect(pruned.children).toHaveLength(1)
    expect(pruned.children![0].name).toBe('a')
    expect(pruned.children![0].children![0].name).toBe('b')
    expect(pruned.children![0].children![0].children![0].name).toBe('deep.md')
  })

  it('removes deeply nested empty directories', () => {
    const root = dir('/r', 'r', [
      dir('/r/a', 'a', [
        dir('/r/a/empty1', 'empty1', []),
        dir('/r/a/empty2', 'empty2', [
          dir('/r/a/empty2/empty3', 'empty3', []),
        ]),
        file('/r/a/keep.md', 'keep.md'),
      ]),
    ])
    const pruned = pruneEmptyDirs(root)
    const a = pruned.children![0]
    expect(a.name).toBe('a')
    expect(a.children).toHaveLength(1)
    expect(a.children![0].name).toBe('keep.md')
  })

  it('removes whole subtree if no markdown anywhere in it', () => {
    const root = dir('/r', 'r', [
      dir('/r/a', 'a', [
        dir('/r/a/b', 'b', [
          dir('/r/a/b/c', 'c', []),
        ]),
      ]),
      file('/r/keep.md', 'keep.md'),
    ])
    const pruned = pruneEmptyDirs(root)
    expect(pruned.children).toHaveLength(1)
    expect(pruned.children![0].name).toBe('keep.md')
  })

  it('keeps root even when all children prune away', () => {
    const root = dir('/r', 'r', [
      dir('/r/empty1', 'empty1', []),
      dir('/r/empty2', 'empty2', []),
    ])
    const pruned = pruneEmptyDirs(root)
    expect(pruned.path).toBe('/r')
    expect(pruned.children).toEqual([])
  })

  it('recomputes recursive mdCount for surviving dirs', () => {
    const root = dir('/r', 'r', [
      dir('/r/a', 'a', [
        file('/r/a/x.md', 'x.md'),
        file('/r/a/y.md', 'y.md'),
        dir('/r/a/sub', 'sub', [file('/r/a/sub/z.md', 'z.md')]),
      ]),
    ])
    const pruned = pruneEmptyDirs(root)
    expect(pruned.children![0].mdCount).toBe(3)
    expect(pruned.children![0].children![2].mdCount).toBe(1)
  })

  it('returns a new tree (immutable)', () => {
    const root = dir('/r', 'r', [
      dir('/r/empty', 'empty', []),
      file('/r/a.md', 'a.md'),
    ])
    const pruned = pruneEmptyDirs(root)
    expect(pruned).not.toBe(root)
    expect(root.children).toHaveLength(2)
  })
})

describe('completeStream', () => {
  it('prunes empty dirs from the tree when streaming finishes', () => {
    const store = useFileTreeStore.getState()
    const root: FileNode = {
      name: 'r',
      path: '/r',
      isDir: true,
      modifiedAt: 0,
      children: [],
    }
    store.startStream(root)
    store.applyStreamNode('/r', [
      { name: 'empty', path: '/r/empty', isDir: true, modifiedAt: 0, children: [] },
      { name: 'a.md',  path: '/r/a.md',  isDir: false, modifiedAt: 0 },
    ])
    store.applyStreamNode('/r/empty', [])
    store.completeStream()

    const tree = useFileTreeStore.getState().tree!
    expect(tree.children).toHaveLength(1)
    expect(tree.children![0].name).toBe('a.md')
  })
})
