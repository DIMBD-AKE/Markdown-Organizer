// src/renderer/src/hooks/useScrollSync.ts
import { useEffect, useState } from 'react'

export function useScrollSync(contentRef: React.RefObject<HTMLElement | null>) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    function onScroll() {
      const headings = Array.from(el!.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      let current: string | null = null
      for (const h of headings) {
        const rect = h.getBoundingClientRect()
        if (rect.top <= 100) current = h.id
      }
      setActiveId(current)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [contentRef.current])

  function scrollToId(id: string) {
    const el = contentRef.current
    if (!el) return
    const target = el.querySelector(`#${CSS.escape(id)}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return { activeId, scrollToId }
}
