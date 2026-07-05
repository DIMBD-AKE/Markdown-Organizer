use crate::models::{Project, ProjectState};
use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const CREATE_TABLES: &str = r#"
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
    scroll_positions TEXT NOT NULL DEFAULT '{}',
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
"#;

pub struct AppDb {
    conn: Mutex<Connection>,
}

impl AppDb {
    pub fn new(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let db_path = db_path(app)?;
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(db_path)?;
        conn.execute_batch(CREATE_TABLES)?;
        ensure_project_state_schema(&conn)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn get_all_projects(&self) -> Result<Vec<Project>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                r#"
                SELECT id, name, path, type, icon,
                       last_opened, created_at
                FROM projects ORDER BY last_opened DESC NULLS LAST
                "#,
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    project_type: row.get(3)?,
                    icon: row.get(4)?,
                    last_opened: row.get(5)?,
                    created_at: row.get(6)?,
                    frameworks: None,
                    confidence: None,
                })
            })
            .map_err(|e| e.to_string())?;

        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn upsert_project(&self, project: &Project) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            r#"
            INSERT INTO projects (id, name, path, type, icon, last_opened, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name, type=excluded.type, icon=excluded.icon,
              last_opened=excluded.last_opened
            "#,
            params![
                project.id,
                project.name,
                project.path,
                project.project_type,
                project.icon,
                project.last_opened,
                project.created_at
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_project_state(&self, project_id: &str) -> Result<Option<ProjectState>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                r#"
                SELECT project_id, last_file, scroll_pos, scroll_positions, expanded_dirs, search_history
                FROM project_state WHERE project_id = ?1
                "#,
            )
            .map_err(|e| e.to_string())?;

        let mut rows = stmt.query(params![project_id]).map_err(|e| e.to_string())?;
        let Some(row) = rows.next().map_err(|e| e.to_string())? else {
            return Ok(None);
        };

        let scroll_positions: String = row.get(3).map_err(|e| e.to_string())?;
        let expanded: String = row.get(4).map_err(|e| e.to_string())?;
        let history: String = row.get(5).map_err(|e| e.to_string())?;
        Ok(Some(ProjectState {
            project_id: row.get(0).map_err(|e| e.to_string())?,
            last_file: row.get(1).map_err(|e| e.to_string())?,
            scroll_pos: row.get(2).map_err(|e| e.to_string())?,
            scroll_positions: serde_json::from_str(&scroll_positions).unwrap_or_default(),
            expanded_dirs: serde_json::from_str(&expanded).unwrap_or_default(),
            search_history: serde_json::from_str(&history).unwrap_or_default(),
        }))
    }

    pub fn get_project_states(&self, projects: &[Project]) -> Result<HashMap<String, ProjectState>, String> {
        let mut states = HashMap::new();
        for project in projects {
            if let Some(state) = self.get_project_state(&project.id)? {
                states.insert(project.id.clone(), state);
            }
        }
        Ok(states)
    }

    pub fn upsert_project_state(&self, state: &ProjectState) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let expanded_dirs = serde_json::to_string(&state.expanded_dirs).map_err(|e| e.to_string())?;
        let search_history = serde_json::to_string(&state.search_history).map_err(|e| e.to_string())?;
        let scroll_positions = serde_json::to_string(&state.scroll_positions).map_err(|e| e.to_string())?;
        conn.execute(
            r#"
            INSERT INTO project_state (project_id, last_file, scroll_pos, scroll_positions, expanded_dirs, search_history)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(project_id) DO UPDATE SET
              last_file=excluded.last_file, scroll_pos=excluded.scroll_pos,
              scroll_positions=excluded.scroll_positions,
              expanded_dirs=excluded.expanded_dirs, search_history=excluded.search_history
            "#,
            params![
                state.project_id,
                state.last_file,
                state.scroll_pos,
                scroll_positions,
                expanded_dirs,
                search_history
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT value FROM app_settings WHERE key = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
        Ok(rows
            .next()
            .map_err(|e| e.to_string())?
            .map(|row| row.get(0).unwrap_or_default()))
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            r#"
            INSERT INTO app_settings (key, value) VALUES (?1, ?2)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
            "#,
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }
}

fn db_path(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(app.path().app_data_dir()?.join("markdown-organizer.db"))
}

fn ensure_project_state_schema(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let mut stmt = conn.prepare("PRAGMA table_info(project_state)")?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;

    if !columns.iter().any(|name| name == "scroll_positions") {
        conn.execute(
            "ALTER TABLE project_state ADD COLUMN scroll_positions TEXT NOT NULL DEFAULT '{}'",
            [],
        )?;
    }

    Ok(())
}
