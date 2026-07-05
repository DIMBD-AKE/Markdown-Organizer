# Tauri Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Electron with Tauri 2 while preserving current desktop behavior and switching releases to local build plus manual GitHub upload.

**Architecture:** Keep the existing React renderer and install a Tauri-backed `window.api` adapter. Port Electron main/preload responsibilities to Rust commands and events under `src-tauri`.

**Tech Stack:** Tauri 2, Rust, React 18, TypeScript, Vite, Tailwind CSS, rusqlite, notify, walkdir, regex, Vitest, Cargo tests.

---

### Task 1: Baseline and Tooling

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`

- [ ] Run `npx vitest run` and record baseline failures.
- [ ] Add Tauri npm packages and remove Electron npm packages.
- [ ] Replace `electron-vite` scripts with Vite and Tauri scripts.
- [ ] Configure `src-tauri` app metadata, bundle targets, updater, and icons.

### Task 2: Renderer Compatibility Adapter

**Files:**
- Create: `src/renderer/src/native/api.ts`
- Create: `src/renderer/src/native/api.d.ts`
- Modify: `src/renderer/src/main.tsx`
- Modify: `tsconfig.web.json`

- [ ] Define the same `window.api` method names used by existing components.
- [ ] Implement commands with `invoke()` and event subscriptions with `listen()`.
- [ ] Install the adapter before React renders.
- [ ] Remove preload type dependency.

### Task 3: Rust Backend Commands

**Files:**
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/db.rs`
- Create: `src-tauri/src/fs_tree.rs`
- Create: `src-tauri/src/search.rs`
- Create: `src-tauri/src/detector.rs`
- Create: `src-tauri/src/watcher.rs`
- Create: `src-tauri/src/commands.rs`

- [ ] Port the project, state, settings, file tree, search, detector, watcher, and window commands.
- [ ] Emit `file-tree-node`, `file-tree-complete`, `file-tree-error`, and `file-changed` events.
- [ ] Preserve the existing file event batch behavior.
- [ ] Add Rust unit tests for search pattern matching and watcher batching.

### Task 4: Remove Electron Runtime

**Files:**
- Delete: `src/main/`
- Delete: `src/preload/`
- Delete: `electron.vite.config.ts`
- Delete: `electron-builder.cjs`
- Modify: `tests/e2e/app.test.ts`
- Modify: `scripts/driver.mjs`
- Modify: `scripts/test-render.mjs`

- [ ] Remove Electron-only source and configuration.
- [ ] Replace or disable Electron-specific E2E helpers until Tauri E2E is wired.
- [ ] Keep unit and integration tests that still cover pure TypeScript behavior.

### Task 5: Local Release Workflow

**Files:**
- Delete: `.github/workflows/ci.yml`
- Delete: `.github/workflows/release.yml`
- Create: `scripts/release-local.mjs`
- Modify: `README.md`

- [ ] Document local `npm run build:*` commands.
- [ ] Add a helper that checks local artifacts and uploads them with `gh release upload`.
- [ ] Remove docs that say GitHub Actions builds release artifacts.

### Task 6: Verification

**Commands:**
- `npm run typecheck`
- `npx vitest run`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `npm run build`

- [ ] Fix TypeScript errors.
- [ ] Fix Rust compile/test errors.
- [ ] Fix Vite/Tauri build errors.
- [ ] Record any remaining follow-up gaps in the final report.
