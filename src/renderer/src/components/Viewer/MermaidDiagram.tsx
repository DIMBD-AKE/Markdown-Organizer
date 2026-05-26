import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ theme: 'dark', darkMode: true, startOnLoad: false })

let idCounter = 0

interface Props { chart: string }

export default function MermaidDiagram({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useRef(`mermaid-${++idCounter}`)

  useEffect(() => {
    let cancelled = false
    if (!ref.current) return
    mermaid.render(id.current, chart)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return
        ref.current.innerHTML = svg
      })
      .catch((err) => {
        if (cancelled || !ref.current) return
        ref.current.textContent = `Mermaid 오류: ${err.message}`
      })
    return () => { cancelled = true }
  }, [chart])

  return <div ref={ref} className="my-4 flex justify-center overflow-x-auto" />
}
