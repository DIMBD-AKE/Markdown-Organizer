use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub project_type: String,
    pub icon: String,
    pub last_opened: Option<i64>,
    pub created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frameworks: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectState {
    pub project_id: String,
    pub last_file: Option<String>,
    pub scroll_pos: i64,
    #[serde(default)]
    pub scroll_positions: HashMap<String, i64>,
    pub expanded_dirs: Vec<String>,
    pub search_history: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub projects: Vec<Project>,
    pub active_project_id: Option<String>,
    pub project_states: HashMap<String, ProjectState>,
    pub theme: String,
    pub window_bounds: Option<WindowBounds>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowBounds {
    pub width: i64,
    pub height: i64,
    pub x: i64,
    pub y: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
    pub modified_at: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub md_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_virtual: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    pub query: String,
    pub mode: String,
    pub scope: String,
    pub project_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub line_number: usize,
    pub line_text: String,
    pub match_start: usize,
    pub match_end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub file_path: String,
    pub file_name: String,
    pub match_count: usize,
    pub matches: Vec<SearchMatch>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct DetectionSummary {
    pub project_type: String,
    pub icon: String,
    pub frameworks: Vec<String>,
    pub confidence: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileReadResponse {
    pub content: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeStreamResponse {
    pub root_node: Option<FileNode>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeNodeEvent {
    pub parent_path: String,
    pub children: Vec<FileNode>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeCompleteEvent {
    pub root_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeErrorEvent {
    pub root_path: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChangedEvent {
    pub events: Vec<FileEvent>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FileEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub path: String,
}
