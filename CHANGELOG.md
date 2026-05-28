# Changelog

All notable changes to Markdown Organizer are documented here.

## [1.1.6] — 2026-05-28

### Changed
- **macOS 배포 형식: DMG → ZIP** — DMG 레이어가 Gatekeeper 우회에 기여하지 않으면서 dmg-builder Python 의존성만 추가됨. zip 안에 `.app`을 그대로 담아 배포 — 압축 해제 후 `/Applications` 드래그. afterPack ad-hoc deep signature는 zip 아카이브에서 보존됨. `*-mac.zip` (arm64/x64).
- **Windows: NSIS Setup + Portable 듀얼 배포** — NSIS 설치파일(`Setup.exe`)이 권장. `%TEMP%` 압축 해제 없이 즉시 실행 + 자동 업데이트 통합. Portable은 USB / 일시 사용용으로 유지. README에 선택 가이드.

### Added
- **Progressive 파일 트리 로딩 — 멈춤 없는 프로젝트 오픈** — 기존 `buildFileTree` 가 전체 재귀 완료까지 await로 UI 정지하던 문제 해소. 신규 `streamFileTree(rootPath, win)` 는 root 노드를 즉시 반환하고 백그라운드 walk가 폴더별 `FILE_TREE_NODE` 이벤트를 푸시. 각 폴더는 자기 자식이 도착하기 전까지 우측에 작은 spinner (Catppuccin overlay 색) 표시.
  - 메인: shared Semaphore(8) 그대로 사용 (M8 패턴). 재귀는 무제한, 실제 syscall만 throttle.
  - 렌더러: `fileTreeStore`에 `loadingDirs: Set<string>`, `isStreaming` 추가. `applyStreamNode`로 immutable 트리 패치 (path-walk + sibling 보존).
  - 세션 복원: 마지막 활성 파일은 stream과 독립적으로 즉시 로드 (파일 경로만 필요). expandedDirs 복원은 데이터 도착 시점에 자동 적용.
- **README 가이드 보강** — macOS 첫 실행 안내: 시스템 설정 → "그래도 열기" 방법 + `xattr -cr` 방법 (Sequoia 15.x "Apple이 확인할 수 없습니다" 다이얼로그 대응). 플랫폼 지원 표에 형식별 비고 추가 (NSIS 권장 / Portable 보조).

### Fixed
- **macOS Gatekeeper "Apple이 확인할 수 없습니다" — 우회 경로 명확화** — M8의 deep ad-hoc sign으로 `damaged file` → `not notarized` 다이얼로그로 변화. notarization은 Apple Developer ID 인증서 ($99/yr) 필요한 근본 해결책 — 별도 마일스톤. M9에서는 사용자 우회 옵션 두 가지를 README에 정식 문서화.

### Tests
- 90 → 103 (streamFileTree integration 8, patchChildren immutable patch 5).
- `tsc --noEmit` clean (node + web), `electron-vite build` clean.

## [1.1.5] — 2026-05-28

### Fixed
- **macOS Gatekeeper "손상된 파일" 근본 수정** — `afterPack` ad-hoc 서명이 top-level 번들만 처리하던 문제 해결. 내부 Mach-O (`.dylib`, Helper.app 실행파일, framework primary, `.node` N-API 모듈) 미서명 → quarantine xattr 붙은 다운로드 앱에서 Gatekeeper 차단. `scripts/sign-mac.cjs`로 Mach-O 후보(`.dylib`/`.so`/`.node` + `.framework`/`.app` 번들)만 골라 bottom-up 서명. `.pak`/`.lproj` 등 리소스 파일은 건드리지 않아 M7 `locale.pak Operation not permitted` 회피. 빌드 끝에 `codesign --verify --strict --deep`로 자동 검증.
- **외부 하이퍼링크 기본 브라우저 미연동** — 마크다운 `[text](https://...)` 클릭이 Electron WebContents 내부에서 열리던 문제. 신규 `OPEN_EXTERNAL` IPC 채널 (`shell.openExternal` + `http(s):` 화이트리스트) 추가. `MarkdownRenderer` `<a>` 핸들러가 외부 URL 감지 시 `preventDefault` 후 IPC 호출.
- **웹 이미지/배지 렌더 불가** — CSP `img-src`에 `https:` 추가. shields.io 등 웹 호스팅 이미지 렌더 가능.
- **Windows 프로젝트 오픈 버벅거림 (구조적 해소)** — `buildFileTree` 재귀 `Promise.all` 이 깊은 트리에서 cascade(limit^depth)로 동시 syscall 폭주(Unity 프로젝트 등에서 10^5 가능). `Semaphore(8)` 도입으로 모든 `stat`/`readdir`을 공유 큐로 통제. 재귀 구조 유지하면서 실제 I/O만 throttle.

### Added
- `src/main/concurrency.ts` — `Semaphore`, `withSemaphore`, `pMap` (순서 보존 동시성 제한 map).
- `src/main/url.ts` — `isAllowedExternalUrl` (electron-free, 테스트 가능).

### Changed
- `electron-builder.cjs` — `compression: 'maximum'` 추가 (LZMA, DMG/AppImage/exe 크기 ~5-10% 감소 예상).
- M8 작업 시작 전 기존 계획 문서를 코드 정독하며 재검증 → Task 1 (afterSign 단독 불충분) + Task 2 (`openPath` ≠ `openExternal`) 두 건의 잘못된 접근법 발견 및 정정. 향후 동일 패턴 방지용 4건의 lesson을 `LESSONS_LEARNED.md`에 추가.

### Tests
- 47 → 90 (URL 11, Semaphore/pMap/withSemaphore 15, sign-mac collectTargets 10, buildFileTree 7).
- 모든 변경 `tsc --noEmit` clean, `electron-vite build` clean.

## [1.1.4] — 2026-05-28

### Fixed
- **Windows 포터블 빌드 미생성 (근본 수정)** — `electron-builder.config.ts` → `electron-builder.cjs`로 파일명 변경. electron-builder v24는 `configFilename: "electron-builder"` prefix로만 탐색(`electron-builder.{yml,json,js,cjs,ts}`) — `electron-builder.config.*` 형식은 탐색 대상이 아님. TypeScript sucrase 의존성도 동시 제거.

## [1.1.3] — 2026-05-28

### Fixed
- **Windows 포터블 빌드 미생성 (시도)** — `electron-builder.config.ts` → `electron-builder.config.cjs` 전환. CJS 변환은 맞았으나 파일명 prefix가 잘못되어 여전히 config 로드 실패. v1.1.4에서 완전 수정.

## [1.1.2] — 2026-05-28

### Fixed
- **뷰어 이미지 렌더링** — CSP `img-src`에 `file:` 누락으로 로컬 이미지(`![]`) 전부 차단되던 문제 수정.
- **Windows 이미지 경로** — `filePath.lastIndexOf('/')` 가 Windows 백슬래시 경로에서 -1 반환하여 잘못된 `file://` URL 생성하던 문제 수정. 백슬래시를 슬래시로 정규화 후 처리.
- **Windows 렉 (근본 원인 제거)** — `analyzeDirectory` 전체 (`detector/index.ts`, `ruleEngine.ts`, `dependencyAnalyzer.ts`)를 `fs.promises` 비동기로 재작성. 앱 시작 시 main 프로세스 이벤트 루프를 수십~수백 ms 블로킹하던 문제 해소.
- **macOS 코드사인 오류** — `electron-builder.config.ts`에 `mac.identity: null` 추가로 keychain 실제 인증서 자동 사용 차단. `afterPack` ad-hoc 서명만 남김. `--deep` 플래그 제거로 `locale.pak` 권한 오류 방지.
- **Windows 포터블 빌드** — NSIS 설치파일 타겟 제거, `portable` 단독 빌드. 릴리즈에 설치 없이 바로 실행 가능한 단일 exe만 업로드.
- **Windows 아이콘** — `build/icon.ico` 사용으로 전환. PNG → ICO 변환 없이 네이티브 윈도우 아이콘 표시.

## [1.1.1] — 2026-05-27

### Fixed
- **창 컨트롤 복원** — Windows: `titleBarOverlay` 추가로 네이티브 최소화/최대화/닫기 버튼 표시. Linux: TitleBar에 커스텀 최소화/최대화/닫기 버튼 구현 (IPC 기반). macOS는 기존 트래픽 라이트 유지.
- **Windows 렉 근본 제거** — `buildFileTree` 전체를 `fs.promises` 비동기로 재작성. 프로젝트 오픈 시 main 프로세스 이벤트 루프 블로킹 해소. `readFileSync` 도 v1.1.0에서 비동기 전환 완료.
- **macOS ad-hoc 코드사이닝 강화** — `afterPack` 훅에서 `execSync`(셸 경유) → `spawnSync`(인자 배열, 셸 미사용)로 교체. 공백 포함 앱 경로 처리 안정화.
- **릴리즈 Draft 잔존 해소** — CI 재설계: `create-release` 잡이 CHANGELOG 내용을 릴리즈 노트로 삼아 즉시 published 상태로 생성. `build` 잡은 `--publish never`로 빌드 후 `.dmg`/`.exe`/`.AppImage`만 수동 업로드 — `blockmap`, `latest.yml` 등 메타데이터 파일 업로드 제거.
- **macOS Gatekeeper 안내** — README에 `xattr -cr` 첫 실행 가이드 추가.

### Changed
- TitleBar: macOS에서만 좌측 80px 여백 적용 (Windows/Linux에서 불필요한 공간 제거).
- `buildFileTree` 반환 타입 `Promise<FileNode>`로 변경 (내부 호출처 영향 없음 — IPC 핸들러가 이미 async).

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
