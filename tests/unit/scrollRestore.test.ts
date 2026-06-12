import { describe, it, expect } from 'vitest'
import { shouldRestoreScroll } from '../../src/renderer/src/components/Viewer/DocumentViewer'

// Regression: search → open a doc that has a saved scroll position must NOT
// restore that scroll, because MarkdownRenderer scrolls to the match instead.
describe('shouldRestoreScroll', () => {
  it('skips restore when opening the active search file with a live query', () => {
    expect(shouldRestoreScroll('/docs/a.md', '/docs/a.md', 'needle')).toBe(false)
  })

  it('restores when no search is active', () => {
    expect(shouldRestoreScroll('/docs/a.md', null, '')).toBe(true)
  })

  it('restores when the open file differs from the search target', () => {
    expect(shouldRestoreScroll('/docs/b.md', '/docs/a.md', 'needle')).toBe(true)
  })

  it('restores when search target matches but the query is whitespace-only', () => {
    expect(shouldRestoreScroll('/docs/a.md', '/docs/a.md', '   ')).toBe(true)
  })
})
