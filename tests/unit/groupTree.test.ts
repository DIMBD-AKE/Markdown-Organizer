import { describe, it, expect } from 'vitest'
import { groupTree } from '../../src/renderer/src/utils/groupTree'
import type { FileNode } from '../../src/renderer/src/types'

function file(name: string, modifiedAt = 0): FileNode {
  return { name, path: `/root/${name}`, isDir: false, modifiedAt }
}
function dir(name: string, children: FileNode[]): FileNode {
  return { name, path: `/root/${name}`, isDir: true, children, modifiedAt: 0 }
}

describe('groupTree', () => {
  it('groups files sharing a date prefix, normalizing formats', () => {
    const out = groupTree(
      [
        file('2026-06-05-agent-permission-rule.md'),
        file('2026_06_05-stage-loop.md'),
        file('20260605-monster-combat.md'),
      ],
      '/root',
      'name',
      'asc'
    )
    expect(out).toHaveLength(1)
    expect(out[0].isVirtual).toBe(true)
    expect(out[0].isDir).toBe(true)
    expect(out[0].name).toBe('2026-06-05')
    expect(out[0].path).toBe('/root::group::date:2026-06-05')
    expect(out[0].children).toHaveLength(3)
  })

  it('groups every date when 2+ files share the date format, singletons included', () => {
    const out = groupTree(
      [
        file('2026-05-30-work1.md'),
        file('2026-05-30-work2.md'),
        file('2026-06-12-work1.md'),
      ],
      '/root',
      'name',
      'asc'
    )
    // Two date groups: the shared 05-30 and the lone 06-12.
    expect(out.every((n) => n.isVirtual)).toBe(true)
    const may = out.find((n) => n.name === '2026-05-30')
    const jun = out.find((n) => n.name === '2026-06-12')
    expect(may?.children).toHaveLength(2)
    expect(jun?.children).toHaveLength(1)
  })

  it('does not group a lone matching file', () => {
    const out = groupTree([file('2026-06-05-agent.md')], '/root', 'name', 'asc')
    expect(out).toHaveLength(1)
    expect(out[0].isVirtual).toBeFalsy()
    expect(out[0].name).toBe('2026-06-05-agent.md')
  })

  it('groups files by common prefix when no date', () => {
    const out = groupTree(
      [file('agent-permission.md'), file('agent-loop.md'), file('readme.md')],
      '/root',
      'name',
      'asc'
    )
    const group = out.find((n) => n.isVirtual)
    expect(group?.name).toBe('agent')
    expect(group?.children).toHaveLength(2)
    // ungrouped file stays loose
    expect(out.some((n) => !n.isVirtual && n.name === 'readme.md')).toBe(true)
  })

  it('rolls date groups up to month when distinct days exceed threshold', () => {
    const files: FileNode[] = []
    for (let d = 1; d <= 14; d++) {
      const dd = String(d).padStart(2, '0')
      files.push(file(`2026-06-${dd}-a.md`))
      files.push(file(`2026-06-${dd}-b.md`))
    }
    const out = groupTree(files, '/root', 'name', 'asc')
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('2026-06')
    expect(out[0].path).toBe('/root::group::date:2026-06')
    expect(out[0].children).toHaveLength(28)
  })

  it('recurses into real subdirectories', () => {
    const out = groupTree(
      [dir('sub', [file('2026-06-05-x.md'), file('2026-06-05-y.md')])],
      '/root',
      'name',
      'asc'
    )
    const sub = out[0]
    expect(sub.children).toHaveLength(1)
    expect(sub.children![0].isVirtual).toBe(true)
    expect(sub.children![0].path).toBe('/root/sub::group::date:2026-06-05')
  })

  it('rejects invalid dates (month/day out of range)', () => {
    const out = groupTree(
      [file('20261356-a.md'), file('20261357-b.md')],
      '/root',
      'name',
      'asc'
    )
    expect(out.every((n) => !n.isVirtual)).toBe(true)
  })
})
