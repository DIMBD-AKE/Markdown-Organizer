# Milestone 3: 검색 기능

**Branch:** `feat/m3-search`
**Completed:** 2026-05-27 11:00
**Status:** Completed ✅

---

## Purpose

Sidebar "검색" 탭을 완전히 구현한다. 전체 텍스트/Regex/와일드카드 검색, 결과 클릭 시 뷰어 이동, 뷰어 내 하이라이트, 이전/다음 내비게이션, Cmd+F 단축키.

---

## What Was Built

**IPC 레이어 (`src/main/ipc/search.ts`)**
- `collectMdFiles(dirPath)` — `.md` + `.markdown` 재귀 수집 (순수 함수, 테스트 가능)
- `buildSearchPattern(query, mode)` — string/regex 공용 RegExp 빌더. string 모드: 특수문자 이스케이프 후 `*` → `.*`, `?` → `.` 와일드카드 변환
- `searchInLoadedFiles(files, query, mode)` — 사전 로드된 컨텐츠 기반 검색 핵심 로직 (I/O 없음)
- `searchInFiles(filePaths, query, mode)` — 동기 파일 읽기 래퍼 (unit test 호환 유지)
- `registerSearchHandlers()` — async IPC 핸들러: `Promise.allSettled` 병렬 읽기 → `searchInLoadedFiles`

**타입 확장 (`src/renderer/src/types/index.ts`)**
- `SearchQuery`, `SearchMatch`, `SearchResult` 추가

**Preload (`src/preload/index.ts`, `src/preload/api.d.ts`)**
- `window.api.searchFiles(query: SearchQuery)` 노출

**채널 (`src/main/ipc/channels.ts`)**
- `SEARCH_FILES: 'search-files'` 추가

**Store (`src/renderer/src/stores/searchStore.ts`)**
- `query/mode/scope/results/isSearching/error` — 검색 상태
- `activeFilePath/activeMatchIndex/activeFileMatches/totalMatchCount` — 뷰어 하이라이트 상태
- `clearSearch()` — mode/scope 보존, 나머지 초기화

**SearchPanel (`src/renderer/src/components/Search/SearchPanel.tsx`)**
- 입력 + Enter, scope 라디오, mode 라디오, 검색 버튼
- 결과 카드: 프로젝트 이름(전체 경로 tooltip) + 스니펫 + `N건 일치`
- 클릭 → `readFile` → `viewerStore.setFile` + `searchStore.setActiveFile`
- sidebarTab 변경 시 input auto-focus

**In-viewer 하이라이트 (`src/renderer/src/components/Viewer/MarkdownRenderer.tsx`)**
- `clearMarks(container)` — mark 제거 + parent Set 기반 `normalize()`
- `buildHighlightRegex(query, mode)` — string 모드 와일드카드 지원
- `insertMarks(container, regex)` — TreeWalker 수집 → DocumentFragment 삽입
- Effect 1 (`[filePath, content, activeFilePath, searchQuery, searchMode]`): 마크 삽입 + totalMatchCount 업데이트
- Effect 2 (`[activeMatchIndex]`): mark-current 클래스 이동 + scrollIntoView
- `remarkPlugins`/`rehypePlugins` 배열 `useMemo` 메모이제이션 추가 (리마운트 방지)

**DocHeader (`src/renderer/src/components/Viewer/DocHeader.tsx`)**
- 검색 활성 시 `[N/M] [↑] [↓] [×]` 표시
- viewerStore/fileTreeStore 전체 구독 버그도 함께 수정 (개별 selector 교체)

**App.tsx**
- `Cmd+F` / `Ctrl+F` 전역 keydown → `setSidebarTab('search')`

**CSS (`src/renderer/src/index.css`)**
- `mark.search-mark` — amber 30% 배경
- `mark.search-mark.mark-current` — amber 65% + outline

**테스트 (`tests/unit/search.test.ts`)**
- 41/41 통과 (신규 20개: collectMdFiles 4개, string 7개, wildcard 3개, regex 4개, empty 2개)

---

## Key Decisions

**DOM 하이라이트 vs rehype 플러그인**
rehype AST는 줄 번호 정보 없음. DOM TreeWalker 방식으로 렌더 후 직접 삽입. React reconciler 충돌 없이 순수 DOM 조작.

**searchInLoadedFiles 분리**
IPC 핸들러는 async 병렬 읽기 사용하지만 핵심 검색 로직은 순수 함수로 분리. 테스트는 동기 `searchInFiles` 래퍼로 기존 호환성 유지.

**totalMatchCount**
IPC 결과(최대 3개 미리보기)와 실제 DOM 발견 수 분리. MarkdownRenderer가 DOM 탐색 후 설정 → DocHeader `[N/M]` 카운터 정확도 확보.

**와일드카드**
string mode에서 `*`/`?` 이스케이프 제외 후 regex 변환. IPC + DOM highlight 양쪽 동일 로직.

---

## Errors and Corrections

1. **SearchMatch 누락 (api.d.ts)** — 스펙 리뷰어 발견. import에 `SearchMatch` 빠짐 → 추가.
2. **`.markdown` 확장자 누락** — 코드 품질 리뷰어 발견 (`docs/side-search.md` 섹션 2.2 명시). collectMdFiles 조건 추가 + 테스트 추가.
3. **font-medium vs font-semibold** — 스펙 "bold" 명시. 수정.
4. **에러 경로 stale results** — 빈 쿼리/프로젝트 없음 조건에서 `setResults([])` 누락. 양 경로에 추가.
5. **UI 언어 불일치** — `matches` (영문) → `건 일치` (한국어).
6. **showClear에 error 미포함** — `|| !!error` 추가.
7. **Effect 1 항상 mark 0으로 스크롤** — `activeMatchIndex` 무시. `Math.min(activeMatchIndex, marks.length - 1)` 사용.
8. **buildHighlightRegex catch 광범위** — `catch {}` → `catch (e) { if (e instanceof SyntaxError) return null; throw e }`.
9. **clearMarks normalize() 루프 내 반복** — parent Set 수집 후 루프 외부에서 once per parent.

---

## Test Results

```
Test Files  6 passed (6)
     Tests  41 passed (41)   (M2 대비 +20)
  Duration  ~200ms
```

---

## Session Continuity Note

M4 시작 전 필독:

- `src/main/analyzer.ts` — M1 이후 미수정. 단순 규칙 기반 (first-match 방식). Confidence 없음.
- M4 목표: `project-detection-planning.md`의 Phase 1 구현 — Confidence 점수 + DependencyAnalyzer + 기술 스택 목록.
- `ProjectType`은 DB 저장됨 (`src/main/db/schema.ts`). M4 타입 확장 시 DB 마이그레이션 필요 여부 검토.
- `TitleBar.tsx`에서 `project.type` + `project.icon` 표시. M4 후 frameworks[] 목록 추가 예정.
- Unity 전용 폴더 제외 로직 (`Library`, `Temp` 등)은 `src/main/fs.ts`에 있음 — M4 탐지 결과와 연계 가능.
- LESSONS_LEARNED.md M3 신규 항목: TreeWalker live NodeList 회피, RegExp lastIndex 오염, useMemo 배열 필수.
