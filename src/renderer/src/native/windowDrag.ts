const NO_DRAG_SELECTOR = 'button,a,input,textarea,select,[role="button"],[data-no-drag]'

interface ClosestTarget {
  closest?: (selector: string) => unknown
}

export interface DragMouseEventLike {
  button: number
  target: EventTarget | ClosestTarget | null
}

export function shouldStartWindowDrag(event: DragMouseEventLike): boolean {
  if (event.button !== 0) return false

  const target = event.target as ClosestTarget | null
  if (typeof target?.closest !== 'function') return true

  return target.closest(NO_DRAG_SELECTOR) == null
}
