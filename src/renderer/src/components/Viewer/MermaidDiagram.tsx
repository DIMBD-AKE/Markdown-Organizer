import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ theme: 'dark', darkMode: true, startOnLoad: false })

let idCounter = 0

interface Props { chart: string }

export default function MermaidDiagram({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useRef(`mermaid-${++idCounter}`)

  useEffect(() => {
    if (!ref.current) return
    mermaid.render(id.current, chart).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg
    }).catch((err) => {
      if (ref.current) ref.current.textContent = `Mermaid 오류: ${err.message}`
    })
  }, [chart])

  return <div ref={ref} className="my-4 flex justify-center overflow-x-auto" />
}
