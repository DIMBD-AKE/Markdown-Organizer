// src/main/db/schema.ts
export const SCHEMA_VERSION = 1

export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    path        TEXT NOT NULL UNIQUE,
    type        TEXT NOT NULL DEFAULT 'unknown',
    icon        TEXT NOT NULL DEFAULT '📁',
    last_opened INTEGER,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_state (
    project_id      TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    last_file       TEXT,
    scroll_pos      INTEGER NOT NULL DEFAULT 0,
    expanded_dirs   TEXT NOT NULL DEFAULT '[]',
    search_history  TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
  );
`
