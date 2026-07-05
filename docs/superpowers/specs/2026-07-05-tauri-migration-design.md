# Tauri Migration Design

## Goal

Replace Electron with Tauri 2 while preserving the existing macOS, Windows, and Linux desktop behavior.

## Approved Scope

- Keep the React, TypeScript, Tailwind, Catppuccin, Geist, Literata, Shiki, Mermaid, and Zustand renderer.
- Replace Electron main/preload IPC with Tauri commands and events.
- Preserve the existing `window.api` shape through a renderer-side compatibility adapter.
- Keep local SQLite state for projects, settings, expanded directories, scroll position, and search history.
- Keep local folder selection, file tree streaming, Markdown file reads, full-text search, path opening, external URL opening, file watching, and window controls.
- Remove GitHub Actions build/release workflows.
- Change release flow to local builds followed by manual GitHub Release upload.

## Out of Scope

- Redesigning the UI.
- Changing the design system in `docs/DESIGN.md`.
- Replacing React with a native UI toolkit.
- Changing the project detection rules beyond the minimum needed to keep current behavior.
- Rewriting historical docs and work logs that describe past Electron milestones.

## Architecture

```text
src/renderer React app
  |
  | window.api compatibility adapter
  v
@tauri-apps/api invoke/listen
  |
  v
src-tauri Rust backend
  |-- app_state: SQLite-backed projects/settings/state
  |-- fs_tree: recursive Markdown-aware tree builder + streamed batches
  |-- search: Markdown file collection + string/regex matching
  |-- detector: project type confidence rules
  |-- watcher: notify-based watcher + leading-edge event batching
  |-- window: close/minimize/maximize/theme overlay equivalents
  |-- updater: Tauri updater command/events
```

The renderer remains the product surface. Rust owns all filesystem, persistence, updater, and OS integration work. The adapter keeps the migration incremental by allowing existing UI components to continue using `window.api`.

## Data Migration

The new Rust database layer should use the same schema and JSON fields as the Electron `better-sqlite3` layer. If possible, it should store the database in Tauri's app data directory under the same logical app identity. A later migration can import legacy Electron user-data locations if needed.

## Release Flow

GitHub Actions should stop building release artifacts. Local build commands produce platform artifacts in `src-tauri/target/release/bundle`. The maintainer then creates or updates a GitHub Release and uploads artifacts with the GitHub CLI.

## Testing Strategy

- Keep existing Vitest unit tests for renderer utilities and TypeScript pure logic.
- Add Rust unit tests for new backend pure functions where behavior is ported from TypeScript.
- Run `npm run typecheck`, `npx vitest run`, `cargo test`, and a Tauri build before considering the migration complete.
