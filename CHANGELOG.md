# Changelog

All notable changes to Markdown Organizer are documented here.

## [1.1.0] — 2026-05-27

### Fixed
- **macOS — "손상된 파일" 오류 해결** — electron-builder `afterPack` 훅으로 ad-hoc 코드사이닝(`codesign --force --deep --sign -`) 적용. arm64 무서명 바이너리가 Gatekeeper에 차단되던 문제 수정.
- **macOS — 트래픽 라이트 표시** — `titleBarStyle: 'hiddenInset'` + `trafficLightPosition: { x: 12, y: 12 }` + TitleBar 80 px 여백으로 창 컨트롤 복원. (v1.0.0에서 `frame: false` → `titleBarStyle: 'hidden'` 으로 전환하며 적용됨)
- **Windows — 문서 클릭 렉 제거** — `READ_FILE` IPC 핸들러의 `fs.readFileSync` → `fs.promises.readFile` 비동기 전환. 메인 프로세스 이벤트 루프 블로킹 해소.
- **자동 업데이트 404 에러 무음 처리** — 비공개 저장소에서 GitHub `latest.yml` 접근 시 발생하는 404/401 HTTP 에러를 `UPDATE_NOT_AVAILABLE`로 변환, 사용자에게 오류 메시지 미표시.

### Added
- **Windows Portable exe** — `electron-builder` 빌드에 `portable` 타겟 추가. 설치 없이 바로 실행 가능한 단일 실행 파일 제공 (`Markdown Organizer-Portable-1.1.0.exe`).

### Changed
- **chokidar 파일 워처** — `depth: 10 → 5`, `awaitWriteFinish` 옵션 추가(200 ms). 대형 프로젝트에서 초기 스캔 부하 감소 및 Windows 이벤트 폭주 완화.
- **릴리즈 CI** — macOS 빌드 코드사이닝 주석 업데이트 (CSC 환경변수 제거 사유 명시).
- **플랫폼 지원 표** — README Linux 항목에서 `.deb` 제거 (v1.0.0에서 Snap Store 자동 publish 문제로 제외됨).

## [1.0.0] — 2026-05-27

### Added
- **Cross-platform packaging** — DMG (macOS x64/arm64), NSIS installer (Windows x64), AppImage + deb (Linux x64) via electron-builder
- **Auto-updater** — GitHub Releases-based; checks 5 s after launch, Settings panel for manual check and install
- **GitHub Actions CI/CD** — parallel matrix build (macOS / Windows / Linux) triggered on `v*` tag push
- **Confidence-based project detection** — 72 rules across 25+ project types (Unity, Unreal, Node, Rust, Python, Go, Java/Kotlin, C#, Swift, Dart, C/C++, AI Research, Docs, …)
- **Multi-project workspace** — register multiple local folders, persist last-opened document, tree state, and scroll position via SQLite
- **Markdown rendering** — GFM, Mermaid diagrams, Shiki syntax highlighting (100+ languages, Catppuccin Mocha), internal-link navigation with history
- **TOC panel** — heading extraction, scroll-sync, click-to-navigate
- **In-document search** — `Cmd+F` / `Ctrl+F`, highlight, prev/next
- **Full-text search** — across all projects with wildcard support
- **Freshness badges** — fresh (≤7 d) / warn (≥30 d) / stale (≥90 d) based on file mtime
- **3-theme system** — Catppuccin Mocha (dark), Black (OLED), Latte (light); persisted via SQLite

### Technical
- Electron 31 + electron-vite + React 18 + TypeScript
- Tailwind CSS v4 + Catppuccin CSS variables
- Zustand state management
- better-sqlite3 for all persistence (asarUnpack for native module)
- chokidar for file watching
- Geist (UI) · Literata (body) · JetBrains Mono (code) font stack
