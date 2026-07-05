use crate::models::{
    FileNode, FileTreeCompleteEvent, FileTreeErrorEvent, FileTreeNodeEvent, FileTreeStreamResponse,
};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Emitter};

const EXCLUDED_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    ".hg",
    ".svn",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    ".svelte-kit",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".turbo",
    "coverage",
    ".nyc_output",
    ".DS_Store",
    "Thumbs.db",
];

const UNITY_EXCLUDED: &[&str] = &["Library", "Temp", "Logs", "obj", "Build", "Builds"];

pub fn build_file_tree(dir_path: &Path) -> FileNode {
    let extra = if is_unity_project(dir_path) {
        UNITY_EXCLUDED.iter().copied().collect()
    } else {
        HashSet::new()
    };
    build_file_tree_inner(dir_path, &extra)
}

pub fn stream_file_tree(root_path: PathBuf, app: AppHandle) -> FileTreeStreamResponse {
    let metadata = match fs::metadata(&root_path) {
        Ok(metadata) => metadata,
        Err(err) => {
            let _ = app.emit(
                "file-tree-error",
                FileTreeErrorEvent {
                    root_path: root_path.to_string_lossy().to_string(),
                    error: err.to_string(),
                },
            );
            return FileTreeStreamResponse {
                root_node: Some(file_node_for_path(&root_path, false, 0.0, None)),
                error: None,
            };
        }
    };

    let root_node = FileNode {
        name: file_name(&root_path),
        path: root_path.to_string_lossy().to_string(),
        is_dir: true,
        children: Some(vec![]),
        modified_at: modified_at(&metadata),
        md_count: None,
        is_virtual: None,
    };

    thread::spawn(move || {
        let extra = if is_unity_project(&root_path) {
            UNITY_EXCLUDED.iter().copied().collect()
        } else {
            HashSet::new()
        };
        if let Err(err) = walk_and_stream(&root_path, &app, &extra) {
            let _ = app.emit(
                "file-tree-error",
                FileTreeErrorEvent {
                    root_path: root_path.to_string_lossy().to_string(),
                    error: err,
                },
            );
            return;
        }
        let _ = app.emit(
            "file-tree-complete",
            FileTreeCompleteEvent {
                root_path: root_path.to_string_lossy().to_string(),
            },
        );
    });

    FileTreeStreamResponse {
        root_node: Some(root_node),
        error: None,
    }
}

pub fn should_ignore_path(path: &Path, extra_excluded: &HashSet<&str>) -> bool {
    path.components().any(|component| {
        let name = component.as_os_str().to_string_lossy();
        name.starts_with('.')
            || EXCLUDED_DIRS.iter().any(|excluded| *excluded == name)
            || extra_excluded.iter().any(|excluded| *excluded == name)
    })
}

pub fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown"))
        .unwrap_or(false)
}

fn build_file_tree_inner(dir_path: &Path, extra_excluded: &HashSet<&str>) -> FileNode {
    let metadata = match fs::metadata(dir_path) {
        Ok(metadata) => metadata,
        Err(_) => return file_node_for_path(dir_path, false, 0.0, None),
    };

    if !metadata.is_dir() {
        return file_node_for_path(dir_path, false, modified_at(&metadata), None);
    }

    let mut dir_children = Vec::new();
    let mut file_children = Vec::new();
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.')
                || EXCLUDED_DIRS.contains(&name.as_str())
                || extra_excluded.contains(name.as_str())
            {
                continue;
            }
            match entry.file_type() {
                Ok(file_type) if file_type.is_dir() => {
                    let child = build_file_tree_inner(&path, extra_excluded);
                    if !child.is_dir || child.md_count.unwrap_or(0) > 0 {
                        dir_children.push(child);
                    }
                }
                Ok(file_type) if file_type.is_file() && is_markdown_file(&path) => {
                    let modified = fs::metadata(&path).map(|m| modified_at(&m)).unwrap_or(0.0);
                    file_children.push(file_node_for_path(&path, false, modified, None));
                }
                _ => {}
            }
        }
    }

    dir_children.sort_by(|a, b| a.name.cmp(&b.name));
    file_children.sort_by(|a, b| a.name.cmp(&b.name));
    let mut children = dir_children;
    children.extend(file_children);
    let md_count = children
        .iter()
        .map(|child| if child.is_dir { child.md_count.unwrap_or(0) } else { 1 })
        .sum();

    file_node_for_path(dir_path, true, modified_at(&metadata), Some((children, md_count)))
}

fn walk_and_stream(root_path: &Path, app: &AppHandle, extra_excluded: &HashSet<&str>) -> Result<(), String> {
    let mut dir_children = Vec::new();
    let mut file_children = Vec::new();
    let entries = match fs::read_dir(root_path) {
        Ok(entries) => entries,
        Err(_) => {
            app.emit(
                "file-tree-node",
                FileTreeNodeEvent {
                    parent_path: root_path.to_string_lossy().to_string(),
                    children: vec![],
                },
            )
            .map_err(|e| e.to_string())?;
            return Ok(());
        }
    };

    let mut child_dirs = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.')
            || EXCLUDED_DIRS.contains(&name.as_str())
            || extra_excluded.contains(name.as_str())
        {
            continue;
        }
        match entry.file_type() {
            Ok(file_type) if file_type.is_dir() => {
                child_dirs.push(path.clone());
                dir_children.push(FileNode {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_dir: true,
                    children: Some(vec![]),
                    modified_at: 0.0,
                    md_count: None,
                    is_virtual: None,
                });
            }
            Ok(file_type) if file_type.is_file() && is_markdown_file(&path) => {
                let modified = fs::metadata(&path).map(|m| modified_at(&m)).unwrap_or(0.0);
                file_children.push(file_node_for_path(&path, false, modified, None));
            }
            _ => {}
        }
    }

    dir_children.sort_by(|a, b| a.name.cmp(&b.name));
    file_children.sort_by(|a, b| a.name.cmp(&b.name));
    let mut children = dir_children;
    children.extend(file_children);
    app.emit(
        "file-tree-node",
        FileTreeNodeEvent {
            parent_path: root_path.to_string_lossy().to_string(),
            children,
        },
    )
    .map_err(|e| e.to_string())?;

    for child in child_dirs {
        walk_and_stream(&child, app, extra_excluded)?;
    }
    Ok(())
}

fn is_unity_project(root: &Path) -> bool {
    root.join("Assets").is_dir() && root.join("ProjectSettings").is_dir()
}

fn file_node_for_path(path: &Path, is_dir: bool, modified_at: f64, children: Option<(Vec<FileNode>, i64)>) -> FileNode {
    let (children, md_count) = match children {
        Some((children, md_count)) => (Some(children), Some(md_count)),
        None => (None, None),
    };
    FileNode {
        name: file_name(path),
        path: path.to_string_lossy().to_string(),
        is_dir,
        children,
        modified_at,
        md_count,
        is_virtual: None,
    }
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string())
}

fn modified_at(metadata: &fs::Metadata) -> f64 {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs_f64() * 1000.0)
        .unwrap_or(0.0)
}
