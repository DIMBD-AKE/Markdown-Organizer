import { useState, useEffect } from 'react'
import mermaid from 'mermaid'

// Initialize once at module level — runs on first import only
mermaid.initialize({
  theme: 'dark',
  darkMode: true,
  startOnLoad: false,
  securityLevel: 'loose',
  fontFamily: 'Geist, system-ui, sans-serif',
})

// Unique ID counter — avoids Mermaid's internal cache conflicts on re-render
let counter = 0

interface Props { chart: string }

export default function MermaidDiagram({ chart }: Props) {
  // Store rendered SVG in React state, NOT in DOM directly.
  // DOM-direct (innerHTML) is wiped on every parent re-render (scroll events,
  // store updates, etc.) and leaves behind the empty container + layout gap.
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let active = true
    setSvg('')
    setError('')

    // New unique ID each render — prevents Mermaid's cache from rejecting
    // repeated renders of the same diagram (common with StrictMode double-invoke)
    const id = `mermaid-${Date.now()}-${++counter}`

    mermaid
      .render(id, chart)
      .then(({ svg: rendered }) => {
        if (active) setSvg(rendered)
      })
      .catch((err: Error) => {
        if (active) setError(err?.message ?? 'parse error')
      })

    return () => { active = false }
  }, [chart])

  if (error) {
    return (
      <pre className="my-4 p-4 bg-mantle text-red text-xs rounded-lg border border-surface0 overflow-x-auto whitespace-pre-wrap">
        mermaid error: {error}
      </pre>
    )
  }

  if (!svg) {
    // Fixed min-height prevents layout shift / scrollbar gap while async render runs
    return (
      <div className="my-4 min-h-[80px] bg-mantle rounded-lg border border-surface0 flex items-center justify-center">
        <span className="text-xs text-overlay0">다이어그램 렌더링 중…</span>
      </div>
    )
  }

  return (
    <div
      // [&_svg]:max-w-full prevents wide diagrams from overflowing the panel
      className="my-4 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
