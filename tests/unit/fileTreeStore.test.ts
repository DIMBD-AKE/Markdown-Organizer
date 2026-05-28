import { describe, it, expect } from 'vitest'
import { __test } from '../../src/renderer/src/stores/fileTreeStore'
import type { FileNode } from '../../src/renderer/src/types'

const { patchChildren } = __test

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
