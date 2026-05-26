import { useEffect, useState } from 'react'
import { getHighlighter } from '../../utils/shiki'

interface Props {
  code: string
  lang: string
}

export default function CodeBlock({ code, lang }: Props) {
  const [html, setHtml] = useState('')
  const [copied, setCopied] = useState(false)

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
    <div className="relative group my-4 rounded-lg overflow-hidden border border-surface0">
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                   text-xs bg-surface0 hover:bg-surface1 text-subtext0 px-2 py-0.5 rounded z-10"
      >
        {copied ? '✓' : 'copy'}
      </button>
      {html
        ? <div dangerouslySetInnerHTML={{ __html: html }} className="overflow-x-auto text-sm" />
        : <pre className="p-4 text-sm text-text bg-mantle overflow-x-auto"><code>{code}</code></pre>
      }
    </div>
  )
}
