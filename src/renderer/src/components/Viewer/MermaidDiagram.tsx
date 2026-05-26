import { useState, useEffect } from 'react'
import { useUiStore } from '../../stores/uiStore'

// Dynamic import — mermaid is lazy-loaded on first diagram render.
// Avoids running mermaid's heavy initialization at app startup.

let counter = 0

interface Props { chart: string }

export default function MermaidDiagram({ chart }: Props) {
  const appTheme = useUiStore((s) => s.theme)

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
        // Initialize on every render so the theme always matches the current app theme.
        // initialize() only sets config options — it's cheap. render() is the heavy part.
        mermaid.initialize({
          startOnLoad: false,
          theme: appTheme === 'latte' ? 'default' : 'dark',
          darkMode: appTheme !== 'latte',
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
  }, [chart, appTheme])

  if (error) {
    return (
      <pre className="not-prose my-4 p-4 bg-mantle text-red text-xs rounded-lg border border-surface0 overflow-x-auto whitespace-pre-wrap">
        mermaid: {error}
      </pre>
    )
  }

  if (!svg) {
    return (
      <div className="not-prose my-4 min-h-[80px] bg-mantle rounded-lg border border-surface0 flex items-center justify-center">
        <span className="text-xs text-overlay0">다이어그램 렌더링 중…</span>
      </div>
    )
  }

  return (
    <div className="not-prose my-4 overflow-x-auto">
      <div
        className="[&_svg]:block [&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  )
}
