import type { TocItem } from '../types'

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
}

export function extractToc(markdown: string): TocItem[] {
  const headingRe = /^(#{1,6})\s+(.+)$/gm
  const flat: { level: number; text: string; id: string }[] = []
  let match: RegExpExecArray | null

  while ((match = headingRe.exec(markdown)) !== null) {
    flat.push({ level: match[1].length, text: match[2].trim(), id: slugify(match[2].trim()) })
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
