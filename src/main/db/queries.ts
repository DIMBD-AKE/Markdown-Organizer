// src/main/db/queries.ts
import type { Database } from 'better-sqlite3'
import type { Project, ProjectState } from '../../renderer/src/types'

export function getAllProjects(db: Database): Project[] {
  return db.prepare(`
    SELECT id, name, path, type, icon,
           last_opened as lastOpened, created_at as createdAt
    FROM projects ORDER BY last_opened DESC NULLS LAST
  `).all() as Project[]
}

export function upsertProject(db: Database, p: Project): void {
  db.prepare(`
    INSERT INTO projects (id, name, path, type, icon, last_opened, created_at)
    VALUES (@id, @name, @path, @type, @icon, @lastOpened, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, type=excluded.type, icon=excluded.icon,
      last_opened=excluded.last_opened
  `).run({ ...p, lastOpened: p.lastOpened ?? null })
}

export function deleteProject(db: Database, id: string): void {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
}

export function getProjectState(db: Database, projectId: string): ProjectState | null {
  const row = db.prepare('SELECT * FROM project_state WHERE project_id = ?').get(projectId) as any
  if (!row) return null
  return {
    projectId: row.project_id,
    lastFile: row.last_file,
    scrollPos: row.scroll_pos,
    expandedDirs: JSON.parse(row.expanded_dirs),
    searchHistory: JSON.parse(row.search_history)
  }
}

export function upsertProjectState(db: Database, state: ProjectState): void {
  db.prepare(`
    INSERT INTO project_state (project_id, last_file, scroll_pos, expanded_dirs, search_history)
    VALUES (@projectId, @lastFile, @scrollPos, @expandedDirs, @searchHistory)
    ON CONFLICT(project_id) DO UPDATE SET
      last_file=excluded.last_file, scroll_pos=excluded.scroll_pos,
      expanded_dirs=excluded.expanded_dirs, search_history=excluded.search_history
  `).run({
    projectId: state.projectId,
    lastFile: state.lastFile,
    scrollPos: state.scrollPos,
    expandedDirs: JSON.stringify(state.expandedDirs),
    searchHistory: JSON.stringify(state.searchHistory)
  })
}

export function getSetting(db: Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(db: Database, key: string, value: string): void {
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(key, value)
}
