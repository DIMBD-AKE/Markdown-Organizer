import type { TocItem } from '../types'

/**
 * Collect the ids of all ancestors of `activeId` in a nested TOC.
 * Used to auto-expand collapsed parents so the active heading stays visible.
 * Returns an empty set when activeId is null or not found.
 */
export function tocAncestorIds(toc: TocItem[], activeId: string | null): Set<string> {
  const result = new Set<string>()
  if (!activeId) return result

  function walk(items: TocItem[], trail: string[]): boolean {
    for (const item of items) {
      if (item.id === activeId) {
        trail.forEach((id) => result.add(id))
        return true
      }
      if (walk(item.children, [...trail, item.id])) return true
    }
    return false
  }

  walk(toc, [])
  return result
}
