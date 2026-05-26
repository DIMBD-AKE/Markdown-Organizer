// tests/integration/projects-ipc.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { CREATE_TABLES } from '../../src/main/db/schema'
import { getAllProjects, upsertProject, deleteProject } from '../../src/main/db/queries'
import { analyzeProjectType } from '../../src/main/analyzer'
import type { Project } from '../../src/renderer/src/types'

function makeDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(CREATE_TABLES)
  return db
}

describe('project management integration', () => {
  let db: Database.Database
  beforeEach(() => { db = makeDb() })
  afterEach(() => db.close())

  it('add + list + remove project lifecycle', () => {
    const p: Project = {
      id: 'test-id',
      name: 'MyProject',
      path: '/tmp/my-project',
      type: analyzeProjectType(['package.json', 'src']),
      icon: '🟢',
      lastOpened: Date.now(),
      createdAt: Date.now()
    }
    upsertProject(db, p)
    expect(getAllProjects(db)).toHaveLength(1)
    expect(getAllProjects(db)[0].type).toBe('node')
    deleteProject(db, 'test-id')
    expect(getAllProjects(db)).toHaveLength(0)
  })
})
