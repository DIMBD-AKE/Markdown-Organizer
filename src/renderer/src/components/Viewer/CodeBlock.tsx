import { useEffect, useState } from 'react'
import { getHighlighter } from '../../utils/shiki'

interface Props {
  code: string
  lang: string
}

const COLLAPSE_THRESHOLD = 40

export default function CodeBlock({ code, lang }: Props) {
  const [html, setHtml] = useState('')
  const [copied, setCopied] = useState(false)
  const lineCount = code.split('\n').length
  const [collapsed, setCollapsed] = useState(lineCount > COLLAPSE_THRESHOLD)

  useEffect(() => {
    let cancelled = false
    getHighlighter()
      .then((hl) => {
        if (cancelled) return
        const out = hl.codeToHtml(code, { lang: lang || 'text', theme: 'catppuccin-mocha' })
        setHtml(out)
      })
      .catch((err) => console.error('Shiki error:', err))
    return () => { cancelled = true }
  }, [code, lang])

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="not-prose my-4 rounded-lg overflow-hidden border border-surface0">
      {/* Header: language badge + copy button */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-mantle border-b border-surface0">
        <span className="text-[11px] font-mono text-overlay0 select-none">{lang || 'text'}</span>
        <button
          onClick={copy}
          className="text-xs text-subtext0 hover:text-text transition-colors px-1.5 py-0.5 rounded hover:bg-surface0"
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      {/* Code body */}
      <div className={`relative ${collapsed ? 'max-h-64 overflow-hidden' : ''}`}>
        {html
          ? <div dangerouslySetInnerHTML={{ __html: html }} className="overflow-x-auto text-sm" />
          : <pre className="p-4 text-sm text-text bg-mantle overflow-x-auto"><code>{code}</code></pre>
        }
        {collapsed && (
          <div
            className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--color-mantle), transparent)' }}
          />
        )}
      </div>
      {/* Collapse toggle — only shown when code exceeds threshold */}
      {lineCount > COLLAPSE_THRESHOLD && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full py-1.5 text-xs text-overlay0 hover:text-text bg-mantle border-t border-surface0 transition-colors"
        >
          {collapsed ? '▾ 펼치기' : '▴ 접기'}
        </button>
      )}
    </div>
  )
}
