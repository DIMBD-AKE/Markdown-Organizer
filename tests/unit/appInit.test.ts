import { describe, expect, it } from 'vitest'
import { getStartupProjectSession } from '../../src/renderer/src/appInit'
import type { AppState, Project } from '../../src/renderer/src/types'

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Docs',
    path: '/workspace/docs',
    type: 'docs',
    icon: 'docs',
    lastOpened: 1,
    createdAt: 1,
    ...overrides,
  }
}

function appState(overrides: Partial<AppState> = {}): AppState {
  return {
    projects: [project()],
    activeProjectId: 'project-1',
    projectStates: {},
    theme: 'dark',
    windowBounds: null,
    ...overrides,
  }
}

describe('getStartupProjectSession', () => {
  it('loads the active project even when no saved project state exists yet', () => {
    const session = getStartupProjectSession(appState())

    expect(session?.project.path).toBe('/workspace/docs')
    expect(session?.expandedDirs).toEqual([])
    expect(session?.lastFile).toBeNull()
  })

  it('restores saved expansion and last file when project state exists', () => {
    const session = getStartupProjectSession(appState({
      projectStates: {
        'project-1': {
          projectId: 'project-1',
          lastFile: '/workspace/docs/README.md',
          scrollPos: 42,
          scrollPositions: {
            '/workspace/docs/README.md': 42,
            '/workspace/docs/notes.md': 300,
          },
          expandedDirs: ['/workspace/docs'],
          searchHistory: [],
        },
      },
    }))

    expect(session?.expandedDirs).toEqual(['/workspace/docs'])
    expect(session?.lastFile).toBe('/workspace/docs/README.md')
    expect(session?.scrollPositions).toEqual({
      '/workspace/docs/README.md': 42,
      '/workspace/docs/notes.md': 300,
    })
  })

  it('ignores stale active project ids', () => {
    const session = getStartupProjectSession(appState({ activeProjectId: 'missing' }))

    expect(session).toBeNull()
  })
})
