import { describe, it, expect } from 'vitest'
import { tocAncestorIds } from '../../src/renderer/src/utils/tocAncestors'
import type { TocItem } from '../../src/renderer/src/types'

const TOC: TocItem[] = [
  {
    id: 'intro', text: 'Intro', level: 1, children: [
      { id: 'arch', text: 'Arch', level: 2, children: [
        { id: 'comp', text: 'Component', level: 3, children: [] },
      ] },
    ],
  },
  { id: 'end', text: 'End', level: 1, children: [] },
]

describe('tocAncestorIds', () => {
  it('returns all ancestors of a deep heading', () => {
    expect(tocAncestorIds(TOC, 'comp')).toEqual(new Set(['intro', 'arch']))
  })

  it('returns empty set for a top-level heading', () => {
    expect(tocAncestorIds(TOC, 'intro')).toEqual(new Set())
  })

  it('returns empty set when id is absent', () => {
    expect(tocAncestorIds(TOC, 'missing')).toEqual(new Set())
  })

  it('returns empty set for null activeId', () => {
    expect(tocAncestorIds(TOC, null)).toEqual(new Set())
  })
})
