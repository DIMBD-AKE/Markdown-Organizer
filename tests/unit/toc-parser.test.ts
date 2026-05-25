import { describe, it, expect } from 'vitest'
import { extractToc } from '../../src/renderer/src/utils/toc'

const MARKDOWN = `
# Introduction
Some text.
## ECS Architecture
### Component
### System
## Rendering
# Conclusion
`

describe('extractToc', () => {
  it('extracts headings with correct levels', () => {
    const toc = extractToc(MARKDOWN)
    expect(toc).toHaveLength(2)
    expect(toc[0].text).toBe('Introduction')
    expect(toc[0].level).toBe(1)
    expect(toc[0].children).toHaveLength(2)
    expect(toc[0].children[0].text).toBe('ECS Architecture')
    expect(toc[0].children[0].children).toHaveLength(2)
  })

  it('generates slug ids', () => {
    const toc = extractToc('# Hello World\n## My Section')
    expect(toc[0].id).toBe('hello-world')
    expect(toc[0].children[0].id).toBe('my-section')
  })

  it('returns empty array for no headings', () => {
    expect(extractToc('Just some text.')).toEqual([])
  })
})
