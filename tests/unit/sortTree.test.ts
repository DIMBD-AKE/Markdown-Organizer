import { describe, it, expect } from 'vitest'
import { sortTree } from '../../src/renderer/src/utils/sortTree'
import type { FileNode } from '../../src/renderer/src/types'

function file(name: string, modifiedAt = 0): FileNode {
  return { name, path: `/${name}`, isDir: false, modifiedAt }
}
function dir(name: string, children: FileNode[] = [], modifiedAt = 0): FileNode {
  return { name, path: `/${name}`, isDir: true, children, modifiedAt }
}

describe('sortTree', () => {
  it('sorts file names with natural (numeric) order', () => {
    const out = sortTree([file('a10'), file('a2'), file('a1')], 'name', 'asc')
    expect(out.map((n) => n.name)).toEqual(['a1', 'a2', 'a10'])
  })

  it('keeps folders before files (dirs-first)', () => {
    const out = sortTree([file('zeta'), dir('alpha'), file('beta')], 'name', 'asc')
    expect(out.map((n) => n.name)).toEqual(['alpha', 'beta', 'zeta'])
  })

  it('descending reverses within each group but keeps dirs-first', () => {
    const out = sortTree([dir('a'), dir('b'), file('x'), file('y')], 'name', 'desc')
    expect(out.map((n) => n.name)).toEqual(['b', 'a', 'y', 'x'])
  })

  it('sorts by modifiedAt date', () => {
    const out = sortTree([file('old', 100), file('new', 300), file('mid', 200)], 'date', 'asc')
    expect(out.map((n) => n.name)).toEqual(['old', 'mid', 'new'])
  })

  it('sorts children recursively', () => {
    const out = sortTree([dir('d', [file('b2'), file('b10'), file('b1')])], 'name', 'asc')
    expect(out[0].children!.map((n) => n.name)).toEqual(['b1', 'b2', 'b10'])
  })

  it('returns empty array unchanged', () => {
    expect(sortTree([], 'name', 'asc')).toEqual([])
  })
})
