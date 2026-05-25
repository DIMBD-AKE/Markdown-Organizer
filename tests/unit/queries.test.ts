import Database from 'better-sqlite3'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CREATE_TABLES } from '../../src/main/db/schema'
import {
  getAllProjects, upsertProject, deleteProject,
  getProjectState, upsertProjectState,
  getSetting, setSetting
} from '../../src/main/db/queries'
import type { Project, ProjectState } from '../../src/renderer/src/types'

function makeTestDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(CREATE_TABLES)
  return db
}

const sampleProject: Project = {
  id: 'proj-1',
  name: 'Test Project',
  path: '/tmp/test',
  type: 'docs',
  icon: '📝',
  lastOpened: null,
  createdAt: Date.now()
}

describe('queries', () => {
  let db: Database.Database

  beforeEach(() => { db = makeTestDb() })
  afterEach(() => db.close())

  it('upsertProject → getAllProjects returns project', () => {
    upsertProject(db, sampleProject)
    const projects = getAllProjects(db)
    expect(projects).toHaveLength(1)
    expect(projects[0].id).toBe('proj-1')
    expect(projects[0].name).toBe('Test Project')
  })

  it('deleteProject removes project', () => {
    upsertProject(db, sampleProject)
    deleteProject(db, 'proj-1')
    expect(getAllProjects(db)).toHaveLength(0)
  })

  it('upsertProjectState → getProjectState round-trips', () => {
    upsertProject(db, sampleProject)
    const state: ProjectState = {
      projectId: 'proj-1',
      lastFile: '/tmp/test/doc.md',
      scrollPos: 150,
      expandedDirs: ['/tmp/test/docs'],
      searchHistory: ['ecs', 'render']
    }
    upsertProjectState(db, state)
    const got = getProjectState(db, 'proj-1')
    expect(got?.scrollPos).toBe(150)
    expect(got?.expandedDirs).toEqual(['/tmp/test/docs'])
    expect(got?.searchHistory).toEqual(['ecs', 'render'])
  })

  it('getSetting / setSetting round-trips', () => {
    setSetting(db, 'theme', 'dark')
    expect(getSetting(db, 'theme')).toBe('dark')
    setSetting(db, 'theme', 'black')
    expect(getSetting(db, 'theme')).toBe('black')
  })
})
