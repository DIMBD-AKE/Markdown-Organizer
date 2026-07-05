import { describe, expect, it } from 'vitest'
import { shouldStartWindowDrag } from '../../src/renderer/src/native/windowDrag'

function targetWithClosest(result: unknown) {
  return {
    closest: () => result,
  }
}

describe('shouldStartWindowDrag', () => {
  it('starts dragging from empty titlebar space', () => {
    expect(shouldStartWindowDrag({
      button: 0,
      target: targetWithClosest(null),
    })).toBe(true)
  })

  it('does not drag from interactive controls', () => {
    expect(shouldStartWindowDrag({
      button: 0,
      target: targetWithClosest({ tagName: 'button' }),
    })).toBe(false)
  })

  it('ignores non-primary mouse buttons', () => {
    expect(shouldStartWindowDrag({
      button: 2,
      target: targetWithClosest(null),
    })).toBe(false)
  })
})
