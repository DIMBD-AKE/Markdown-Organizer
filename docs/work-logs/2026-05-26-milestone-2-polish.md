# Milestone 2: 버그 픽스 & 폴리시 (M2)

**Branch:** `fix/m2-polish`
**Created:** 2026-05-26
**Status:** In Progress

---

## Context (Read This First)

M1 완료 후 상태:
- 앱 실행 및 프로덕션 빌드 정상 (`npm run build` 통과)
- TypeScript 타입 체크 통과 (`npx tsc --noEmit`)
- SQLite vitest 5개 실패 — Electron Node ABI 불일치 (앱 동작 무관, 이 마일스톤에서 수정)
- 3단 레이아웃, 테마, 파일 브라우저, Markdown 렌더링, 히스토리 내비게이션 모두 동작

M2 목표: 렌더링 품질 개선, 코드 블록 기능 완성, 파일 트리 ↔ 뷰어 동기화.

관련 LESSONS_LEARNED 항목:
- Mermaid SVG React state 패턴 — 이미 M1에서 적용됨. M2에서는 초기화 최적화 및 edge case 검증.
- Electron native 모듈 + vitest ABI — tests/unit/queries.test.ts, tests/integration/projects-ipc.test.ts 수정 대상.

---

## Task Breakdown

### Task 1: Mermaid 렌더링 안정화

**목표:** 모든 다이어그램 타입 정상 렌더링, 빠른 초기 표시.

**Files to modify:**
- `src/renderer/src/components/Viewer/MermaidDiagram.tsx`

**구체적 문제:**
1. `mermaid.initialize()`를 매 render effect마다 호출 중 → 비용 낭비. 모듈 레벨 once로 이동.
2. 일부 다이어그램 타입(sequence, ER 등) 미렌더링 → securityLevel, theme 설정 검증
3. 앱 전체 스크롤바 + 하단 빈 영역 → SVG `height` 속성이 뷰포트 초과 시 발생 가능. `[&_svg]:max-h-[60vh]` 클래스 추가 검토.

**Implementation notes:**
```ts
// MermaidDiagram.tsx 상단에 once 초기화
let initialized = false
function ensureInit() {
  if (initialized) return
  initialized = true
  mermaid.initialize({ startOnLoad: false, theme: 'dark', ... })
}
// effect 내부: ensureInit() 호출 후 render
```

---

### Task 2: 코드 블록 기능 완성

**목표:** 복사 버튼, 언어 배지, 줄 번호, 긴 코드 접기.

**Files to modify:**
- `src/renderer/src/components/Viewer/CodeBlock.tsx`

**현재 상태:** Shiki 문법 강조만 동작. UI 기능 없음.

**Implementation notes:**
```tsx
// CodeBlock 구조
<div className="relative group my-4 rounded-lg overflow-hidden">
  {/* 상단 바 */}
  <div className="flex items-center justify-between px-4 py-2 bg-mantle border-b border-surface0">
    <span className="text-xs font-mono text-overlay0">{lang}</span>
    <CopyButton code={code} />
  </div>
  {/* 코드 */}
  <div className={collapsed ? 'max-h-64 overflow-hidden' : ''}>
    {/* shiki output */}
  </div>
  {/* 접기 버튼 (40줄 이상일 때만) */}
  {lineCount > 40 && <CollapseButton />}
</div>
```

CopyButton: `navigator.clipboard.writeText(code)` → 1.5초 후 아이콘 리셋.
줄 번호: Shiki `addClassToHast` 옵션 또는 CSS counter 활용.

---

### Task 3: 파일 트리 ↔ 내비게이션 동기화

**목표:** 뒤로/앞으로 클릭 시 좌측 파일 트리가 해당 파일로 선택 + 스크롤.

**Files to modify:**
- `src/renderer/src/stores/viewerStore.ts` (filePath 변경 감지)
- `src/renderer/src/stores/fileTreeStore.ts` (selectedFile setter)
- `src/renderer/src/components/FileTree/FileTree.tsx` (selectedFile 기준 자동 스크롤)
- `src/renderer/src/components/Viewer/DocHeader.tsx` (navigate 후 동기화 트리거)

**Implementation notes:**
DocHeader `navigate()` 함수에서 `loadFile` 호출 후 `useFileTreeStore.getState().setSelectedFile(p)` 추가.

파일 트리 자동 스크롤: `selectedFile`이 변경될 때 해당 DOM 노드를 `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`.
트리가 접혀 있으면 상위 폴더 자동 펼침 필요 — `expandDir(ancestorPath)` 호출.

**주의:** FileTree의 가상 스크롤이 있다면 `scrollIntoView`가 작동하지 않을 수 있음. 현재 구현 확인 후 대응.

---

### Task 4: SQLite vitest ABI 불일치 수정

**목표:** `npm test` 전체 통과.

**Files to modify:**
- `vitest.config.ts`
- `tests/unit/queries.test.ts`
- `tests/integration/projects-ipc.test.ts`

**옵션 A — mock 분리 (권장):**
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    server: { deps: { inline: ['better-sqlite3'] } }
  }
})
```
또는 better-sqlite3를 vi.mock()으로 처리 후 인메모리 구현.

**옵션 B — sql.js 대체:**
테스트 환경에서만 `sql.js` (wasm, Node 버전 무관) 사용. 실제 앱은 better-sqlite3 유지.

**옵션 C — 빌드 타겟 리빌드:**
`npm rebuild better-sqlite3 --runtime=node --target=$(node -e "console.log(process.version)")`
→ 앱 실행 깨질 수 있으므로 비권장.

---

## Pre-implemented Items

없음. M1에서 M2 항목을 미리 구현한 것 없음.

---

## Test Plan

1. Mermaid: flowchart / sequence / ER / gantt / state — 각 타입 렌더 확인
2. Mermaid: 스크롤 후 SVG 유지 확인, 앱 스크롤바 없음 확인
3. CodeBlock: 복사 버튼 클릭 → 클립보드 확인, 아이콘 변경 1.5초 후 복구
4. CodeBlock: 40줄 이상 코드 접기/펼치기
5. 파일 클릭 → 뒤로 → 파일 트리 선택 동기화 확인
6. 파일 트리에 없는 경로(내부 링크 이동) → 뒤로 → 트리 동기화 확인
7. `npm test` 전체 통과 (21개 이상)

---

## Gotchas

- **FileTree 가상 스크롤:** 현재 FileTree가 가상화되어 있다면 DOM 노드가 없어 `scrollIntoView` 실패. 먼저 FileTree.tsx에서 가상화 여부 확인.
- **Mermaid initialize once:** module-level `initialized` flag는 dev HMR 시 리셋 안 됨. HMR 중 테마 변경이 반영 안 될 수 있음 — 개발 중엔 허용.
- **CodeBlock Shiki async:** `codeToHtml`이 async. CodeBlock이 이미 Suspense/useEffect 패턴 쓰는지 확인 후 복사 버튼 레이어 추가.
- **better-sqlite3 mock:** queries.ts의 함수들이 `db` 인스턴스를 외부에서 주입받는 구조면 mock이 쉬움. 현재 `src/main/db/index.ts`에서 singleton으로 export 중 — 테스트용 mock 주입 경로 필요.
- LESSONS_LEARNED.md의 모든 항목 적용 확인 (특히 StrictMode useRef, 히스토리 분리).
