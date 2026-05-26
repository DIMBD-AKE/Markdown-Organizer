import { createHighlighter, type Highlighter } from 'shiki'

let _highlighter: Highlighter | null = null

export async function getHighlighter(): Promise<Highlighter> {
  if (_highlighter) return _highlighter
  _highlighter = await createHighlighter({
    themes: ['catppuccin-mocha'],
    langs: ['typescript', 'javascript', 'python', 'rust', 'csharp', 'cpp',
            'yaml', 'json', 'bash', 'markdown', 'go', 'java']
  })
  return _highlighter
}
