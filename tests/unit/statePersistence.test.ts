import { describe, expect, it } from 'vitest'
import { buildProjectStateSnapshot, createDebouncedProjectStateSaver } from '../../src/renderer/src/statePersistence'

describe('buildProjectStateSnapshot', () => {
  it('returns null when there is no active project', () => {
    expect(buildProjectStateSnapshot({
      activeProjectId: null,
      viewerFilePath: '/docs/a.md',
      selectedPath: '/docs/a.md',
      expandedDirs: new Set(['/docs']),
      scrollPos: 120,
      scrollPositions: { '/docs/a.md': 120 },
    })).toBeNull()
  })

  it('persists the currently displayed file over a stale tree selection', () => {
    const snapshot = buildProjectStateSnapshot({
      activeProjectId: 'project-1',
      viewerFilePath: '/docs/current.md',
      selectedPath: '/docs/old.md',
      expandedDirs: new Set(['/docs', '/docs/nested']),
      scrollPos: 240,
      scrollPositions: {
        '/docs/old.md': 99,
        '/docs/current.md': 12,
      },
    })

    expect(snapshot).toEqual({
      projectId: 'project-1',
      lastFile: '/docs/current.md',
      scrollPos: 240,
      scrollPositions: {
        '/docs/old.md': 99,
        '/docs/current.md': 240,
      },
      expandedDirs: ['/docs', '/docs/nested'],
      searchHistory: [],
    })
  })

  it('does not persist a selected directory as the last file', () => {
    const snapshot = buildProjectStateSnapshot({
      activeProjectId: 'project-1',
      viewerFilePath: null,
      selectedPath: '/docs/folder',
      expandedDirs: new Set(['/docs']),
      scrollPos: 0,
      scrollPositions: {},
    })

    expect(snapshot?.lastFile).toBeNull()
  })

  it('persists per-file scroll positions across app restarts', () => {
    const snapshot = buildProjectStateSnapshot({
      activeProjectId: 'project-1',
      viewerFilePath: '/docs/b.md',
      selectedPath: '/docs/b.md',
      expandedDirs: new Set(),
      scrollPos: 125,
      scrollPositions: {
        '/docs/a.md': 800,
        '/docs/b.md': 10,
      },
    })

    expect(snapshot?.scrollPositions).toEqual({
      '/docs/a.md': 800,
      '/docs/b.md': 125,
    })
  })
})

describe('createDebouncedProjectStateSaver', () => {
  it('flushes the latest snapshot immediately', () => {
    const saved: unknown[] = []
    let scrollPos = 10
    const saver = createDebouncedProjectStateSaver({
      delayMs: 500,
      getSnapshot: () => ({
        projectId: 'project-1',
        lastFile: '/docs/a.md',
        scrollPos,
        scrollPositions: { '/docs/a.md': scrollPos },
        expandedDirs: [],
        searchHistory: [],
      }),
      save: (state) => { saved.push(state) },
    })

    saver.schedule()
    scrollPos = 400
    saver.flush()

    expect(saved).toEqual([{
      projectId: 'project-1',
      lastFile: '/docs/a.md',
      scrollPos: 400,
      scrollPositions: { '/docs/a.md': 400 },
      expandedDirs: [],
      searchHistory: [],
    }])
  })
})
