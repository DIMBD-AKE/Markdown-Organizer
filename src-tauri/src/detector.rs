use crate::models::DetectionSummary;
use serde_json::Value;
use std::collections::BTreeSet;
use std::fs;
use std::path::Path;

pub fn detect_project(root: &Path) -> DetectionSummary {
    if root.join("Assets").is_dir() && root.join("ProjectSettings").is_dir() {
        return summary("unity", "🎮", &["Unity"], 90);
    }
    if has_extension(root, "uproject") {
        return summary("unreal", "🎮", &["Unreal"], 90);
    }
    if root.join("src-tauri/tauri.conf.json").is_file() {
        return summary("rust", "🦀", &["Tauri"], 90);
    }
    if root.join("Cargo.toml").is_file() {
        return summary("rust", "🦀", &["Rust"], 80);
    }
    if root.join("go.mod").is_file() {
        return summary("go", "🐹", &["Go"], 80);
    }
    if root.join("pyproject.toml").is_file() || root.join("requirements.txt").is_file() {
        return summary("python", "🐍", &["Python"], 80);
    }
    if root.join("pubspec.yaml").is_file() {
        return summary("dart", "💙", &["Flutter/Dart"], 75);
    }
    if root.join("package.json").is_file() {
        return detect_node_project(root);
    }
    if root.join("pom.xml").is_file() || root.join("build.gradle").is_file() || root.join("build.gradle.kts").is_file() {
        return summary("java", "☕", &["Java"], 70);
    }
    if has_extension(root, "csproj") || has_extension(root, "sln") {
        return summary("csharp", "🪟", &["C#"], 70);
    }
    if markdown_count(root, 3) >= 3 {
        return summary("docs", "📚", &["Markdown"], 60);
    }
    summary("unknown", "📁", &[], 0)
}

fn detect_node_project(root: &Path) -> DetectionSummary {
    let package_path = root.join("package.json");
    let package_json = fs::read_to_string(package_path).ok();
    let package: Option<Value> = package_json
        .as_deref()
        .and_then(|content| serde_json::from_str(content).ok());
    let deps = package
        .as_ref()
        .map(read_dependencies)
        .unwrap_or_default();

    let mut frameworks = Vec::new();
    for (dep, label) in [
        ("next", "Next.js"),
        ("nuxt", "Nuxt"),
        ("react", "React"),
        ("vue", "Vue"),
        ("svelte", "Svelte"),
        ("@tauri-apps/api", "Tauri"),
        ("electron", "Electron"),
    ] {
        if deps.contains(dep) {
            frameworks.push(label.to_string());
        }
    }
    if frameworks.is_empty() {
        frameworks.push("Node.js".to_string());
    }

    DetectionSummary {
        project_type: "node".to_string(),
        icon: "⚛".to_string(),
        confidence: if deps.is_empty() { 50 } else { 75 },
        frameworks,
    }
}

fn read_dependencies(package: &Value) -> BTreeSet<String> {
    let mut deps = BTreeSet::new();
    for section in ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] {
        if let Some(object) = package.get(section).and_then(Value::as_object) {
            deps.extend(object.keys().cloned());
        }
    }
    deps
}

fn has_extension(root: &Path, ext: &str) -> bool {
    let Ok(entries) = fs::read_dir(root) else {
        return false;
    };
    entries.flatten().any(|entry| {
        entry
            .path()
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| value.eq_ignore_ascii_case(ext))
            .unwrap_or(false)
    })
}

fn markdown_count(root: &Path, limit: usize) -> usize {
    let Ok(entries) = fs::read_dir(root) else {
        return 0;
    };
    let mut count = 0;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file()
            && path
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown"))
                .unwrap_or(false)
        {
            count += 1;
            if count >= limit {
                return count;
            }
        }
    }
    count
}

fn summary(project_type: &str, icon: &str, frameworks: &[&str], confidence: i64) -> DetectionSummary {
    DetectionSummary {
        project_type: project_type.to_string(),
        icon: icon.to_string(),
        frameworks: frameworks.iter().map(|value| value.to_string()).collect(),
        confidence,
    }
}
