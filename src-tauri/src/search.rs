use crate::fs_tree::is_markdown_file;
use crate::models::{SearchMatch, SearchQuery, SearchResponse, SearchResult};
use regex::{Regex, RegexBuilder};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};

pub fn search_files(query: &SearchQuery) -> SearchResponse {
    if query.query.is_empty() || query.project_paths.is_empty() {
        return SearchResponse { results: vec![], error: None };
    }

    let pattern = match build_search_pattern(&query.query, &query.mode) {
        Ok(pattern) => pattern,
        Err(error) => return SearchResponse { results: vec![], error: Some(error) },
    };

    let mut files = Vec::new();
    for project_path in &query.project_paths {
        files.extend(collect_md_files(Path::new(project_path)));
    }

    let mut results = Vec::new();
    for file_path in files {
        let Ok(content) = fs::read_to_string(&file_path) else {
            continue;
        };
        let matches = find_matches(&content, &pattern);
        if matches.is_empty() {
            continue;
        }
        results.push(SearchResult {
            file_name: file_path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default()
                .to_string(),
            file_path: file_path.to_string_lossy().to_string(),
            match_count: matches.len(),
            matches: matches.into_iter().take(3).collect(),
        });
    }

    results.sort_by(|a, b| b.match_count.cmp(&a.match_count));
    SearchResponse { results, error: None }
}

fn collect_md_files(root: &Path) -> Vec<PathBuf> {
    WalkDir::new(root)
        .into_iter()
        .filter_entry(keep_entry)
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file() && is_markdown_file(entry.path()))
        .map(DirEntry::into_path)
        .collect()
}

fn keep_entry(entry: &DirEntry) -> bool {
    let name = entry.file_name().to_string_lossy();
    if entry.depth() == 0 {
        return true;
    }
    !(name.starts_with('.')
        || matches!(
            name.as_ref(),
            "node_modules"
                | ".git"
                | ".hg"
                | ".svn"
                | "dist"
                | "build"
                | "out"
                | ".next"
                | ".nuxt"
                | ".svelte-kit"
                | "__pycache__"
                | ".pytest_cache"
                | ".mypy_cache"
                | ".turbo"
                | "coverage"
                | ".nyc_output"
        ))
}

fn find_matches(content: &str, pattern: &Regex) -> Vec<SearchMatch> {
    let mut matches = Vec::new();
    for (index, line) in content.lines().enumerate() {
        for found in pattern.find_iter(line) {
            matches.push(SearchMatch {
                line_number: index + 1,
                line_text: line.to_string(),
                match_start: found.start(),
                match_end: found.end(),
            });
        }
    }
    matches
}

pub fn build_search_pattern(query: &str, mode: &str) -> Result<Regex, String> {
    if mode == "regex" {
        return RegexBuilder::new(query)
            .case_insensitive(true)
            .build()
            .map_err(|_| "invalid_regex".to_string());
    }

    let escaped = regex::escape(query)
        .replace("\\*", ".*")
        .replace("\\?", ".");
    RegexBuilder::new(&escaped)
        .case_insensitive(true)
        .build()
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn string_mode_escapes_regex_chars_but_keeps_wildcards() {
        let pattern = build_search_pattern("file-?.*.md", "string").unwrap();
        assert!(pattern.is_match("file-a.anything.md"));
        assert!(!pattern.is_match("file-aa.anything.md"));
    }

    #[test]
    fn invalid_regex_reports_expected_error_code() {
        let err = build_search_pattern("[", "regex").unwrap_err();
        assert_eq!(err, "invalid_regex");
    }

    #[test]
    fn finds_line_matches_with_one_based_line_numbers() {
        let pattern = build_search_pattern("needle", "string").unwrap();
        let matches = find_matches("nope\nNeedle here", &pattern);
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].line_number, 2);
        assert_eq!(matches[0].match_start, 0);
    }
}
