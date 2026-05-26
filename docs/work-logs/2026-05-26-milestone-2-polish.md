# Milestone 2: 버그 픽스 & 폴리시 (M2)

**Branch:** `fix/m2-polish`
**Completed:** 2026-05-27 01:30
**Status:** Completed

---

## Purpose

M1에서 미완성된 렌더링 품질, UX 동기화, 테스트 인프라 문제 해결. Mermaid/CodeBlock 안정화, 파일 트리 ↔ 뷰어 동기화, SQLite vitest 픽스, 프로젝트 관리 UI 추가.

---

## What Was Built

**렌더링 픽스:**
- `DocumentViewer.tsx` — 개별 Zustand selector 사용 (전체 state 구독 제거 → scrollPos 리렌더 루프 차단)
- `MarkdownRenderer.tsx` — `useMemo([filePath])`로 components 안정화 (ReactMarkdown 자식 언마운트 방지)
- `MermaidDiagram.tsx` — appTheme 구독, 동적 theme 적용 (latte=default, 나머지=dark), `not-prose` 래퍼
- `CodeBlock.tsx` — 언어 배지 헤더, 40줄 초과 접기/펼치기, `not-prose` (prose margin 차단)
- `DocumentViewer.tsx` — scroll area에 `select-text` 추가 (App root `select-none` override)

**내비게이션 동기화:**
- `DocHeader.tsx` — 뒤로/앞으로 후 `setSelectedFile` + `expandDirs(ancestorDirs)` 호출
- `FileTree.tsx` — `selectedFile` 변경 시 `virtualizer.scrollToIndex` 자동 스크롤
- `fileTreeStore.ts` — `expandDirs(paths)` 액션 추가 (기존 set에 더하기)
- `viewerStore.ts` — `clearForProjectSwitch()` 추가 (뷰어+히스토리 전체 초기화)

**프로젝트 관리 (TitleBar):**
- 드롭다운 각 프로젝트 항목에 hover × 삭제 버튼
- 헤더 우측 Finder 열기 버튼 (폴더 아이콘)
- 프로젝트 전환 시 `startWatcher(newPath)` IPC 호출

**IPC 추가:**
- `channels.ts` — `START_WATCHER`, `OPEN_PATH` 채널
- `ipc/projects.ts` — `startWatcher` (chokidar 재시작), `openPath` (shell.openPath) 핸들러
- `watcher.ts` — 빈 경로 가드 (stop-only 모드)
- `preload/index.ts`, `api.d.ts` — `startWatcher`, `openPath` 노출

**테스트 인프라:**
- `tests/__mocks__/better-sqlite3.ts` — `node:sqlite` 기반 wrapper (createRequire 패턴)
- `vitest.config.ts` — `resolve.alias` + `server.deps.external` 설정
- **21/21 통과**

**개발 도구:**
- `scripts/driver.mjs` — Playwright Electron REPL 드라이버
- `scripts/test-render.mjs` — 렌더링 자동화 테스트 스크립트

---

## Key Decisions

- **Zustand selector 분리**: `useViewerStore()` (no selector) 대신 개별 selector → scrollPos 구독 제거가 핵심
- **useMemo for components**: ReactMarkdown의 `components` prop이 컴포넌트 타입 identity에 영향 — 렌더마다 새 함수 = 자식 언마운트
- **node:sqlite via createRequire**: Vite 정적 분석이 `node:sqlite`를 해석 못함 → 런타임 dynamic require로 우회
- **clearForProjectSwitch()**: 프로젝트 전환 시 히스토리/뷰어 전체 초기화 — 다른 프로젝트 경로가 뒤로가기에 남는 문제 방지

---

## Errors and Corrections

1. **scrollPos 구독 제거 첫 시도 실패** → `getState()`를 effect에서 썼지만 hook 호출 자체가 여전히 전체 구독. 사용자가 "스크롤마다 재렌더링 여전함" 지적 후 개별 selector 방식으로 재수정.

2. **Mermaid 무한 루프 + 하단 다이어그램 미렌더** → 위 scrollPos 버그 + useMemo 누락 복합. 사용자가 직접 증상 ("렌더 영역 가려지면 무한 반복", "최상단 제외 하단 렌더 안됨") 재보고.

3. **`node:sqlite` Vite 정적 분석 에러** → `server.deps.external` 먼저 시도, 실패. `createRequire` 패턴으로 해결.

4. **`export =` + ESM import 혼용** → `ReferenceError: better_sqlite3_module`. `export default`로 변경.

5. **`select-none` 전체 적용** → App root `select-none`이 document content에도 적용 ("스크린샷 느낌"). `select-text` override로 해결.

6. **nested `<button>` 문제** → 프로젝트 row(button) 안에 delete(button) 배치 불가. row를 `<div>`+`<button>` 구조로 재작성.

---

## Test Results

21/21 통과. 기존 SQLite 5개 실패 → node:sqlite mock으로 전환 후 통과.

---

## Session Continuity Note

M2 완료. 앱 실행 및 빌드 정상. 21/21 테스트 통과.

핵심 아키텍처 패턴 확립:
- Zustand selector 분리 (전체 구독 금지)
- ReactMarkdown components useMemo 필수
- SQLite vitest = node:sqlite wrapper (createRequire)

M3에서는 검색 기능 (Sidebar "검색" 탭) 구현. `docs/side-search.md`에 기능 명세 있음.
`docs/project-detection-planning.md`에 프로젝트 자동 탐지 시스템 기획 있음 (M4 이후 고려).

다음 세션 시작 전 필독: 이 work-log + `docs/work-logs/LESSONS_LEARNED.md`.
