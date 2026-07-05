use crate::db::AppDb;
use crate::detector;
use crate::fs_tree;
use crate::models::{
    AppState, FileReadResponse, FileTreeStreamResponse, Project, ProjectState, SearchQuery,
    SearchResponse,
};
use crate::{search, watcher};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State, Window};
use uuid::Uuid;

#[tauri::command]
pub fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_maximize(window: Window) -> Result<(), String> {
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn set_title_bar_overlay(_theme: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn select_folder() -> Option<String> {
    rfd::FileDialog::new()
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn add_project(folder_path: String, db: State<'_, AppDb>) -> Result<Project, String> {
    let detected = detector::detect_project(Path::new(&folder_path));
    let now = now_ms();
    let project = Project {
        id: Uuid::new_v4().to_string(),
        name: Path::new(&folder_path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(&folder_path)
            .to_string(),
        path: folder_path,
        project_type: detected.project_type,
        icon: detected.icon,
        last_opened: Some(now),
        created_at: now,
        frameworks: Some(detected.frameworks),
        confidence: Some(detected.confidence),
    };
    db.upsert_project(&project)?;
    Ok(project)
}

#[tauri::command]
pub fn remove_project(id: String, db: State<'_, AppDb>) -> Result<(), String> {
    db.delete_project(&id)
}

#[tauri::command]
pub fn save_project_state(state: ProjectState, db: State<'_, AppDb>) -> Result<(), String> {
    db.upsert_project_state(&state)
}

#[tauri::command]
pub fn get_file_tree(dir_path: String) -> Result<crate::models::FileNode, String> {
    Ok(fs_tree::build_file_tree(Path::new(&dir_path)))
}

#[tauri::command]
pub fn get_file_tree_stream(dir_path: String, app: AppHandle) -> FileTreeStreamResponse {
    fs_tree::stream_file_tree(PathBuf::from(dir_path), app)
}

#[tauri::command]
pub fn read_file(file_path: String) -> FileReadResponse {
    match fs::read_to_string(file_path) {
        Ok(content) => FileReadResponse {
            content: Some(content),
            error: None,
        },
        Err(err) => FileReadResponse {
            content: None,
            error: Some(err.to_string()),
        },
    }
}

#[tauri::command]
pub fn get_app_state(db: State<'_, AppDb>, app: AppHandle) -> Result<AppState, String> {
    let raw_projects = db.get_all_projects()?;
    let mut projects = Vec::new();
    for mut project in raw_projects {
        let detected = detector::detect_project(Path::new(&project.path));
        project.icon = detected.icon;
        project.frameworks = Some(detected.frameworks);
        project.confidence = Some(detected.confidence);
        projects.push(project);
    }
    let active_project_id = db.get_setting("active_project_id")?;
    if let Some(active_id) = active_project_id.as_deref() {
        if let Some(project) = projects.iter().find(|project| project.id == active_id) {
            let _ = watcher::start_watcher(&project.path, app);
        }
    }
    let project_states = db.get_project_states(&projects)?;
    let theme = db.get_setting("theme")?.unwrap_or_else(|| "dark".to_string());
    Ok(AppState {
        projects,
        active_project_id,
        project_states,
        theme,
        window_bounds: None,
    })
}

#[tauri::command]
pub fn get_setting(key: String, db: State<'_, AppDb>) -> Result<Option<String>, String> {
    db.get_setting(&key)
}

#[tauri::command]
pub fn set_setting(key: String, value: String, db: State<'_, AppDb>) -> Result<(), String> {
    db.set_setting(&key, &value)
}

#[tauri::command]
pub fn start_watcher(project_path: String, app: AppHandle) -> Result<(), String> {
    watcher::start_watcher(&project_path, app)
}

#[tauri::command]
pub fn open_path(target_path: String) -> Result<(), String> {
    open::that(target_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Ok(());
    }
    open::that(url).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_files(query: SearchQuery) -> SearchResponse {
    search::search_files(&query)
}

#[tauri::command]
pub fn get_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub fn check_for_updates(app: AppHandle) -> Result<(), String> {
    app.emit("update-not-available", ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn install_update() -> Result<(), String> {
    Ok(())
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}
