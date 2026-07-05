import { describe, it, expect, beforeEach } from 'vitest'
import { useViewerStore } from '../../src/renderer/src/stores/viewerStore'

beforeEach(() => {
  useViewerStore.getState().clearForProjectSwitch()
})

describe('viewer file loading state', () => {
  it('beginFileLoad sets filePath + loading, clears content', () => {
    useViewerStore.getState().setFile('/old.md', 'old content')
    useViewerStore.getState().beginFileLoad('/new.md')
    const s = useViewerStore.getState()
    expect(s.filePath).toBe('/new.md')
    expect(s.content).toBeNull()
    expect(s.isFileLoading).toBe(true)
    expect(s.error).toBeNull()
  })

  it('setFile resolves the load and clears the flag', () => {
    useViewerStore.getState().beginFileLoad('/new.md')
    useViewerStore.getState().setFile('/new.md', '# Hello')
    const s = useViewerStore.getState()
    expect(s.content).toBe('# Hello')
    expect(s.isFileLoading).toBe(false)
  })

  it('setError clears the loading flag', () => {
    useViewerStore.getState().beginFileLoad('/new.md')
    useViewerStore.getState().setError('read failed')
    const s = useViewerStore.getState()
    expect(s.isFileLoading).toBe(false)
    expect(s.error).toBe('read failed')
  })

  it('beginFileLoad does not duplicate history (setFile owns history push)', () => {
    useViewerStore.getState().setFile('/a.md', 'a')
    useViewerStore.getState().beginFileLoad('/b.md')
    useViewerStore.getState().setFile('/b.md', 'b')
    const s = useViewerStore.getState()
    expect(s.history).toEqual(['/a.md', '/b.md'])
  })

  it('beginFileLoad resets scroll position when opening a different file', () => {
    useViewerStore.getState().setFile('/a.md', 'a')
    useViewerStore.getState().setScrollPos(800)
    useViewerStore.getState().beginFileLoad('/b.md')

    expect(useViewerStore.getState().scrollPos).toBe(0)
  })

  it('beginFileLoad restores the last scroll position for a previously opened file', () => {
    useViewerStore.getState().setFile('/a.md', 'a')
    useViewerStore.getState().setScrollPos(800)
    useViewerStore.getState().beginFileLoad('/b.md')
    useViewerStore.getState().setFile('/b.md', 'b')
    useViewerStore.getState().setScrollPos(125)
    useViewerStore.getState().beginFileLoad('/a.md')

    expect(useViewerStore.getState().scrollPos).toBe(800)
  })

  it('does not overwrite a saved file scroll position with loading scroll events', () => {
    useViewerStore.getState().setFile('/a.md', 'a')
    useViewerStore.getState().setScrollPos(800)
    useViewerStore.getState().beginFileLoad('/b.md')
    useViewerStore.getState().setFile('/b.md', 'b')
    useViewerStore.getState().setScrollPos(125)
    useViewerStore.getState().beginFileLoad('/a.md')

    // When the viewer swaps to a short loading spinner, the browser can clamp
    // the scroll container to top and emit a scroll event. That event belongs
    // to the loading transition, not to the restored file position.
    useViewerStore.getState().setScrollPos(0)
    useViewerStore.getState().setFile('/a.md', 'a again')

    const s = useViewerStore.getState()
    expect(s.scrollPos).toBe(800)
    expect(s.scrollPositions['/a.md']).toBe(800)
  })

  it('beginFileLoad can preserve scroll for startup restore', () => {
    useViewerStore.getState().setScrollPos(800)
    useViewerStore.getState().beginFileLoad('/a.md', { preserveScroll: true })

    expect(useViewerStore.getState().scrollPos).toBe(800)
  })

  it('resets scroll position when opening a different file', () => {
    useViewerStore.getState().setFile('/a.md', 'a')
    useViewerStore.getState().setScrollPos(800)
    useViewerStore.getState().setFile('/b.md', 'b')

    expect(useViewerStore.getState().scrollPos).toBe(0)
  })

  it('setFile restores the last scroll position for a previously opened file', () => {
    useViewerStore.getState().setFile('/a.md', 'a')
    useViewerStore.getState().setScrollPos(800)
    useViewerStore.getState().setFile('/b.md', 'b')
    useViewerStore.getState().setScrollPos(125)
    useViewerStore.getState().setFile('/a.md', 'a again')

    expect(useViewerStore.getState().scrollPos).toBe(800)
  })

  it('does not overwrite a direct setFile restore with immediate render scroll events', () => {
    useViewerStore.getState().setFile('/a.md', 'a')
    useViewerStore.getState().setScrollPos(800)
    useViewerStore.getState().setFile('/b.md', 'b')
    useViewerStore.getState().setScrollPos(125)
    useViewerStore.getState().setFile('/a.md', 'a again')

    useViewerStore.getState().setScrollPos(0)

    const s = useViewerStore.getState()
    expect(s.scrollPos).toBe(800)
    expect(s.scrollPositions['/a.md']).toBe(800)
  })

  it('allows user scroll updates after completing a pending restore', () => {
    useViewerStore.getState().setFile('/a.md', 'a')
    useViewerStore.getState().setScrollPos(800)
    useViewerStore.getState().setFile('/b.md', 'b')
    useViewerStore.getState().setScrollPos(125)
    useViewerStore.getState().setFile('/a.md', 'a again')

    useViewerStore.getState().setScrollPos(0)
    useViewerStore.getState().completeScrollRestore('/a.md')
    useViewerStore.getState().setScrollPos(900)

    const s = useViewerStore.getState()
    expect(s.scrollPos).toBe(900)
    expect(s.scrollPositions['/a.md']).toBe(900)
  })

  it('loadFile restores the last scroll position for history navigation', () => {
    useViewerStore.getState().setFile('/a.md', 'a')
    useViewerStore.getState().setScrollPos(800)
    useViewerStore.getState().setFile('/b.md', 'b')
    useViewerStore.getState().setScrollPos(125)

    const path = useViewerStore.getState().goBack()
    expect(path).toBe('/a.md')
    useViewerStore.getState().loadFile('/a.md', 'a again')

    const s = useViewerStore.getState()
    expect(s.scrollPos).toBe(800)
    expect(s.history).toEqual(['/a.md', '/b.md'])
    expect(s.historyIndex).toBe(0)
  })

  it('hydrates saved per-file scroll positions after app restart', () => {
    useViewerStore.getState().setScrollPositions({
      '/a.md': 800,
      '/b.md': 125,
    })
    useViewerStore.getState().beginFileLoad('/a.md')

    expect(useViewerStore.getState().scrollPos).toBe(800)
  })
})
