use crate::fs_tree::{is_markdown_file, should_ignore_path};
use crate::models::{FileChangedEvent, FileEvent};
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::{BTreeMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

static WATCHER: OnceLock<Mutex<Option<RecommendedWatcher>>> = OnceLock::new();

pub fn start_watcher(project_path: &str, app: AppHandle) -> Result<(), String> {
    stop_watcher();
    if project_path.is_empty() {
        return Ok(());
    }

    let project = PathBuf::from(project_path);
    let extra = if project.join("Assets").is_dir() && project.join("ProjectSettings").is_dir() {
        ["Library", "Temp", "Logs", "obj", "Build", "Builds"]
            .into_iter()
            .collect()
    } else {
        HashSet::new()
    };
    let batcher = EventBatcher::new(app);

    let mut watcher = notify::recommended_watcher(move |event: Result<Event, notify::Error>| {
        let Ok(event) = event else {
            return;
        };
        let Some(event_type) = event_type(&event.kind) else {
            return;
        };
        for path in event.paths {
            if should_skip_event_path(&path, &extra) {
                continue;
            }
            batcher.push(event_type, path);
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&project, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    let slot = WATCHER.get_or_init(|| Mutex::new(None));
    *slot.lock().map_err(|e| e.to_string())? = Some(watcher);
    Ok(())
}

pub fn stop_watcher() {
    if let Some(slot) = WATCHER.get() {
        if let Ok(mut watcher) = slot.lock() {
            *watcher = None;
        }
    }
}

fn event_type(kind: &EventKind) -> Option<&'static str> {
    match kind {
        EventKind::Create(_) => Some("add"),
        EventKind::Modify(_) => Some("change"),
        EventKind::Remove(_) => Some("unlink"),
        _ => None,
    }
}

fn should_skip_event_path(path: &Path, extra: &HashSet<&str>) -> bool {
    if should_ignore_path(path, extra) {
        return true;
    }
    if path.is_dir() {
        return false;
    }
    if path.exists() {
        return !is_markdown_file(path);
    }
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| !(ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown")))
        .unwrap_or(false)
}

#[derive(Clone)]
struct EventBatcher {
    app: AppHandle,
    state: Arc<Mutex<BatchState>>,
}

#[derive(Default)]
struct BatchState {
    pending: BTreeMap<String, String>,
    scheduled: bool,
}

impl EventBatcher {
    fn new(app: AppHandle) -> Self {
        Self {
            app,
            state: Arc::new(Mutex::new(BatchState::default())),
        }
    }

    fn push(&self, event_type: &'static str, path: PathBuf) {
        let mut should_spawn = false;
        if let Ok(mut state) = self.state.lock() {
            state
                .pending
                .insert(path.to_string_lossy().to_string(), event_type.to_string());
            if !state.scheduled {
                state.scheduled = true;
                should_spawn = true;
            }
        }
        if !should_spawn {
            return;
        }

        let app = self.app.clone();
        let state = Arc::clone(&self.state);
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(200));
            let events = {
                let Ok(mut state) = state.lock() else {
                    return;
                };
                state.scheduled = false;
                let events = state
                    .pending
                    .iter()
                    .map(|(path, event_type)| FileEvent {
                        event_type: event_type.clone(),
                        path: path.clone(),
                    })
                    .collect::<Vec<_>>();
                state.pending.clear();
                events
            };
            if !events.is_empty() {
                let _ = app.emit("file-changed", FileChangedEvent { events });
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::event_type;
    use notify::EventKind;

    #[test]
    fn maps_notify_kinds_to_renderer_event_types() {
        assert_eq!(event_type(&EventKind::Create(notify::event::CreateKind::Any)), Some("add"));
        assert_eq!(event_type(&EventKind::Modify(notify::event::ModifyKind::Any)), Some("change"));
        assert_eq!(event_type(&EventKind::Remove(notify::event::RemoveKind::Any)), Some("unlink"));
        assert_eq!(event_type(&EventKind::Access(notify::event::AccessKind::Any)), None);
    }
}
