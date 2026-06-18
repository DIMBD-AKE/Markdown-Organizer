import GithubSlugger from 'github-slugger'
import type { TocItem } from '../types'

export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger()
  const headingRe = /^(#{1,6})\s+(.+)$/
  const flat: { level: number; text: string; id: string }[] = []

  // Track fenced code blocks (``` or ~~~) so headings inside them are ignored.
  let fence: string | null = null

  for (const rawLine of markdown.split('\n')) {
    const fenceMatch = rawLine.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      if (fence === null) {
        fence = marker
        continue
      }
      // Closing fence must use the same marker char.
      if (fence === marker) {
        fence = null
        continue
      }
    }
    if (fence !== null) continue

    const match = headingRe.exec(rawLine)
    if (match) {
      const text = match[2].trim()
      flat.push({ level: match[1].length, text, id: slugger.slug(text) })
    }
  }

  if (flat.length === 0) return []

  const root: TocItem[] = []
  const stack: TocItem[] = []

  for (const h of flat) {
    const item: TocItem = { id: h.id, text: h.text, level: h.level, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop()
    }
    if (stack.length === 0) {
      root.push(item)
    } else {
      stack[stack.length - 1].children.push(item)
    }
    stack.push(item)
  }

  return root
}
