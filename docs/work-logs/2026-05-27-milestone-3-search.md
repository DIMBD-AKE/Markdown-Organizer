# Milestone 3: 검색 기능 (M3)

**Branch:** `feat/m3-search`
**Created:** 2026-05-27
**Status:** In Progress

---

## Context (Read This First)

M2 완료 후 상태:
- 앱 실행/빌드 정상, 21/21 테스트 통과
- Sidebar에 검색 탭 아이콘 + 라우팅 존재 (`sidebarTab === 'search'` → `SearchPanel`)
- `SearchPanel.tsx` 현재 스텁 ("준비 중" 텍스트만 있음)
- IPC 채널/핸들러 구조 확립 (`src/main/ipc/channels.ts` + `src/main/ipc/projects.ts`)
- Zustand selector 분리 필수, useMemo(components) 필수 — 렌더링 안정성 핵심 패턴

M3 목표: Sidebar "검색" 탭 완성 — 전체 텍스트/파일명/Heading 검색, 결과 클릭 시 뷰어 이동 + 하이라이트, 이전/다음 네비게이션.

명세 전문: `docs/side-search.md`

LESSONS_LEARNED.md에서 M3에 적용되는 항목:
- Zustand no-selector = 전체 state 구독 (scrollPos 등 무관한 변경에도 리렌더)
- ReactMarkdown components useMemo 필수 (filePath deps)
- StrictMode useRef cleanup-only 패턴 피하기

---

## Task Breakdown

### Task 1: IPC — searchFiles 핸들러

**Files to create:**
- `src/main/ipc/search.ts`

**Files to modify:**
- `src/main/ipc/channels.ts` — `SEARCH_FILES: 'search-files'` 추가
- `src/main/index.ts` — search IPC 핸들러 등록
- `src/preload/index.ts` — `searchFiles` expose
- `src/preload/api.d.ts` — 타입 선언

**Implementation notes:**

```ts
// channels.ts 추가
SEARCH_FILES: 'search-files',

// search.ts 핸들러 시그니처
interface SearchQuery {
  query: string
  mode: 'string' | 'regex'
  scope: 'current' | 'all'   // 'current' = activeProjectId 기준
  projectPaths: string[]      // scope='current' 이면 [activePath], scope='all' 이면 모든 경로
}

interface SearchMatch {
  lineNumber: number
  lineText: string
  matchStart: number   // 라인 내 match 시작 인덱스
  matchEnd: number     // 라인 내 match 끝 인덱스
}

interface SearchResult {
  filePath: string
  fileName: string
  matchCount: number
  matches: SearchMatch[]   // 최대 3개 미리보기 (나머지는 클릭 후 in-viewer)
}
```

구현 전략:
- `fs.readdirSync` 재귀 대신 이미 있는 `getFileTree` 로직 재활용하거나 직접 `glob` 패턴으로 `.md` 파일 수집
- 파일당 `fs.readFileSync` → 줄 분리 → 각 줄에 문자열/regex 매치 검사
- regex 오류 시 `{ error: 'invalid_regex' }` 반환
- 결과는 matchCount 내림차순 정렬
- 성능: 파일 수 많은 프로젝트 대비 동기 처리 (Electron main process는 UI 블로킹 없음), 필요 시 chunked 비동기로 전환

**api.d.ts 추가:**
```ts
searchFiles(query: SearchQuery): Promise<{ results: SearchResult[]; error?: string }>
```

---

### Task 2: searchStore

**Files to create:**
- `src/renderer/src/stores/searchStore.ts`

**Implementation notes:**

```ts
interface SearchStore {
  query: string
  mode: 'string' | 'regex'
  scope: 'current' | 'all'
  results: SearchResult[]
  isSearching: boolean
  error: string | null
  // in-viewer highlight state
  activeFilePath: string | null
  activeMatchIndex: number     // 현재 뷰어에서 몇 번째 match
  activeFileMatches: SearchMatch[]  // 현재 열린 파일의 전체 match 목록

  setQuery(q: string): void
  setMode(m: 'string' | 'regex'): void
  setScope(s: 'current' | 'all'): void
  setResults(r: SearchResult[]): void
  setSearching(b: boolean): void
  setError(e: string | null): void
  setActiveFile(filePath: string, matches: SearchMatch[]): void
  setActiveMatchIndex(i: number): void
  clearSearch(): void
}
```

---

### Task 3: SearchPanel UI

**Files to modify:**
- `src/renderer/src/components/Search/SearchPanel.tsx` — 전체 구현

**UI 구성 (세로 배치):**
```
┌─────────────────────┐
│ 검색           [×]  │  ← 제목 + 초기화
├─────────────────────┤
│ [검색어 입력______] │  ← input, onKeyDown Enter
│ ○ 현재  ○ 전체      │  ← scope radio
│ ○ 문자열  ○ Regex   │  ← mode radio
│ [검색]              │  ← 버튼 (Enter도 동작)
├─────────────────────┤
│ 결과 3개            │  ← 결과 개수 헤더
├─────────────────────┤
│ InventorySystem.md  │  ← 파일명 bold
│ /path/to/file.md    │  ← 경로 muted xs
│ ...inventory sys... │  ← 컨텍스트 스니펫 (첫 3개 match)
│ 5 matches           │  ← match 개수 badge
│ ─────────────       │
│ ...                 │
└─────────────────────┘
```

**구현 주의:**
- 결과 스크롤 영역은 `overflow-y-auto` + 고정 높이 (flex-1)
- 검색 결과 클릭 → `viewerStore.setFile(path, content)` + `searchStore.setActiveFile(path, allMatches)`
- 파일 로드는 `window.api.readFile(result.filePath)` 후 viewerStore.setFile

---

### Task 4: In-viewer 검색 하이라이트

**방법: rehype 플러그인 방식 (권장)**

`MarkdownRenderer.tsx`에 `activeFilePath` + `activeFileMatches` 구독 추가. 매치가 있는 경우 커스텀 rehype 플러그인으로 텍스트 노드에서 match 위치에 `<mark>` 삽입.

**대안 (더 간단): DOM 직접 조작**
뷰어 렌더 완료 후 `useEffect`에서 `document.querySelectorAll` + `Range` + `mark` 태그 삽입. 단 React reconciler와 충돌 가능 → 권장하지 않음.

**권장 구현:**
```ts
// rehype-mark-search.ts (custom rehype plugin)
// AST를 순회하며 text 노드에서 searchMatches에 해당하는 텍스트를 <mark> 로 래핑
// activeMatchIndex에 해당하는 mark는 class="mark-current" 추가
```

CSS:
```css
mark { background: var(--color-yellow)/40; border-radius: 2px; }
mark.mark-current { background: var(--color-orange)/70; outline: 1px solid var(--color-orange); }
```

**자동 스크롤:** 현재 match mark 요소에 `element.scrollIntoView({ block: 'center' })`

---

### Task 5: In-viewer 네비게이션 UI

**Files to modify:**
- `src/renderer/src/components/Viewer/DocHeader.tsx` — 검색 활성화 시 네비게이션 UI 추가

```
┌─────────────────────────────────────────┐
│ ← →  FileName.md   [2/5] [↑] [↓]  [×] │
└─────────────────────────────────────────┘
```

- `[2/5]` — 현재 match / 전체 match 개수
- `[↑] [↓]` — 이전/다음 match (searchStore.setActiveMatchIndex)
- `[×]` — 검색 하이라이트 해제 (searchStore.clearSearch)
- 검색으로 열린 문서가 아닐 때는 네비게이션 숨김

---

### Task 6: Cmd+F 단축키

**Files to modify:**
- `src/renderer/src/App.tsx` — global keydown listener

```ts
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if (e.metaKey && e.key === 'f') {
      e.preventDefault()
      useUiStore.getState().setSidebarTab('search')
      // focus search input — searchStore에 focusSearch() 액션 또는 커스텀 이벤트
    }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [])
```

SearchPanel input focus: `useEffect(() => { if (sidebarTab === 'search') inputRef.current?.focus() }, [sidebarTab])`

---

## Pre-implemented Items

- Sidebar 검색 탭 아이콘/라우팅 ✅
- SearchPanel 컴포넌트 파일 존재 (스텁) ✅
- IPC 채널/핸들러 구조 ✅
- viewerStore.setFile() + loadFile() 분리 ✅

---

## Test Plan

- `tests/unit/search.test.ts` — 순수 함수 단위 테스트:
  - 문자열 검색: 정확한 match 위치/컨텍스트
  - Regex 검색: 패턴 매칭
  - 빈 쿼리: 결과 없음
  - 잘못된 regex: error 반환
  - 대소문자 처리 (default: case-insensitive)
- Integration: IPC `search-files` 핸들러 (실제 임시 파일 생성 후 검색)

---

## Gotchas

**Zustand 전체 구독 금지** (LESSONS_LEARNED 2026-05-27)
SearchPanel과 DocHeader에서 searchStore 구독 시 반드시 개별 selector 사용.
`useSearchStore()` (no selector) → searchStore 변경마다 리렌더 → 렌더링 불안정.

**ReactMarkdown components useMemo** (LESSONS_LEARNED 2026-05-27)
rehype-mark-search 플러그인을 MarkdownRenderer에 추가할 때, `remarkPlugins`/`rehypePlugins` 배열도 렌더마다 새 참조면 컴포넌트 언마운트 발생. `useMemo` deps에 activeMatchIndex 포함 주의 — match 이동마다 전체 MD 재파싱 발생.
→ 하이라이트는 rehype 플러그인보다 **DOM mark 오버레이 방식**이 성능상 유리할 수 있음. 구현 중 성능 이슈 시 전환 고려.

**rehype 플러그인에서 line-based match 적용의 어려움**
rehype AST는 줄 번호 정보가 없음. match를 텍스트 오프셋 기반으로 처리해야 함.
대안: 렌더 후 DOM에서 `TreeWalker`로 텍스트 노드 순회 + Range 객체로 mark 삽입. React state 업데이트 없이 DOM 직접 조작이지만 viewer 자체는 건드리지 않아 reconciler 충돌 최소화.

**Electron main process 파일 검색 성능**
동기 fs 연산은 main process에서 UI를 블록하지 않음 (renderer와 별개 process). 단 수천 개 파일 프로젝트에서는 IPC 응답 시간 길어질 수 있음. 필요 시 `setImmediate` chunking 또는 결과 스트리밍 (IPC event emit) 고려.

**Regex 보안**
사용자 입력 regex를 `new RegExp(query)` 로 그대로 사용하면 ReDoS 가능. Electron main에서만 실행되므로 DoS는 자기 자신에게만 영향. 단 catastrophic backtracking으로 UI 멈춤 방지를 위해 timeout wrapper 고려.
