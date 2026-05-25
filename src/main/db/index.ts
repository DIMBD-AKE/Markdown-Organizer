// src/main/db/index.ts
import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { CREATE_TABLES, SCHEMA_VERSION } from './schema'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db
  const dbPath = path.join(app.getPath('userData'), 'organizer.db')
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.exec(CREATE_TABLES)
  const row = _db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined
  if (!row) {
    _db.prepare('INSERT INTO schema_version VALUES (?)').run(SCHEMA_VERSION)
  }
  return _db
}

export function closeDb(): void {
  _db?.close()
  _db = null
}
