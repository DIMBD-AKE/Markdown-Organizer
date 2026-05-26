import { useRef, useState } from 'react'

interface Props {
  onDelta: (delta: number) => void
  onCommit?: () => void
}

/**
 * Thin drag handle for resizing adjacent panels.
 * Captures mousemove on window so fast drags don't lose tracking.
 */
export default function ResizeHandle({ onDelta, onCommit }: Props) {
  const [dragging, setDragging] = useState(false)
  const lastX = useRef(0)

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    setDragging(true)
    lastX.current = e.clientX

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - lastX.current
      lastX.current = ev.clientX
      if (delta !== 0) onDelta(delta)
    }

    function onUp() {
      setDragging(false)
      onCommit?.()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        w-[3px] flex-shrink-0 cursor-col-resize transition-colors duration-100
        ${dragging ? 'bg-amber/60' : 'bg-surface0 hover:bg-amber/40'}
      `}
    />
  )
}
