import { useState, useEffect } from 'react'

// Dynamic import — mermaid is lazy-loaded on first diagram render.
// Avoids running mermaid's heavy initialization at app startup.
// Pattern adapted from Unity-Orchestrator's MarkdownViewer.tsx.

let counter = 0

interface Props { chart: string }

export default function MermaidDiagram({ chart }: Props) {
  // SVG stored in React state — NOT via ref.current.innerHTML.
  // Direct innerHTML manipulation is wiped when any ancestor re-renders
  // (scroll events → viewerStore → DocumentViewer re-render → reconciler
  // rebuilds the empty <div> → innerHTML gone → height collapses → layout gap).
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let active = true
    setSvg('')
    setError('')

    ;(async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          darkMode: true,
          securityLevel: 'loose',
          fontFamily: 'Geist, system-ui, sans-serif',
        })
        // Random ID each render — prevents Mermaid's internal cache from
        // rejecting repeated renders with the same ID (common in StrictMode).
        const id = `mermaid-${Math.random().toString(36).slice(2)}-${++counter}`
        const { svg: rendered } = await mermaid.render(id, chart)
        if (active) setSvg(rendered)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'parse error')
      }
    })()

    return () => { active = false }
  }, [chart])

  if (error) {
    return (
      <pre className="my-4 p-4 bg-mantle text-red text-xs rounded-lg border border-surface0 overflow-x-auto whitespace-pre-wrap">
        mermaid: {error}
      </pre>
    )
  }

  if (!svg) {
    return (
      <div className="my-4 min-h-[80px] bg-mantle rounded-lg border border-surface0 flex items-center justify-center">
        <span className="text-xs text-overlay0">다이어그램 렌더링 중…</span>
      </div>
    )
  }

  return (
    <div
      className="my-4 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
