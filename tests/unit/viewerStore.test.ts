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
})
