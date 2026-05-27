# Lessons Learned

> 반복하지 말아야 할 실수, 검증된 패턴.

---

## React StrictMode useRef cleanup-only 패턴 — 2026-05-26

**Symptom:** 파일 클릭 후 뷰어 갱신 없음. `mountedRef.current`가 항상 `false`.

**Root cause:**
```ts
const mountedRef = useRef(true)
useEffect(() => () => { mountedRef.current = false }, [])
// 빈 body + cleanup만 있는 effect
```
StrictMode dev 모드: mount → cleanup(`false`) → remount(body 없음 → `true`로 리셋 안 됨) → 영구 `false`.

**Failed attempts:** 조건 분기 추가, useCallback deps 변경 — 모두 무효.

**Correct fix:** `mountedRef` 완전 제거. abort controller나 `active` 로컬 변수를 effect 내부에서 선언.

---

## Electron native 모듈 + vitest 버전 불일치 — 2026-05-26

**Symptom:** `better-sqlite3` 테스트 `ERR_DLOPEN_FAILED`. `NODE_MODULE_VERSION` 불일치.

**Root cause:** `npm postinstall`이 Electron Node 버전 기준으로 better-sqlite3를 빌드. 시스템 Node vitest는 다른 ABI 버전 요구.

**Failed attempts:** `npm rebuild` — Electron 빌드 깨짐.

**Correct fix (M2 예정):** vitest에서 better-sqlite3를 mock 처리하거나, `--environment electron` 플래그, 또는 sqlite 레이어를 테스트 가능한 순수 함수로 분리.

---

## Mermaid SVG ref.innerHTML → 스크롤 후 소멸 — 2026-05-26

**Symptom:** Mermaid 다이어그램이 스크롤하면 사라지고 하단에 빈 여백 발생.

**Root cause:** 뷰어 스크롤 → `setScrollPos` → viewerStore 업데이트 → DocumentViewer 리렌더 → React reconciler가 빈 `<div>` 복원 → `ref.current.innerHTML` 소멸.

**Failed attempts:** `key` prop 고정, `shouldComponentUpdate` 류 최적화.

**Correct fix:** SVG 문자열을 React `useState`에 저장 → `dangerouslySetInnerHTML={{ __html: svg }}`. React state는 reconciler가 보존.

---

## Mermaid 동일 ID StrictMode 캐시 충돌 — 2026-05-26

**Symptom:** StrictMode dev에서 Mermaid 다이어그램 간헐적 미렌더링.

**Root cause:** `useRef`로 고정 ID 생성 → StrictMode mount→cleanup→remount 시 같은 ID 재사용 → Mermaid 내부 캐시가 이미 처리된 ID로 거부.

**Correct fix:** Effect 내부에서 `Math.random().toString(36).slice(2)` 기반 ID 생성. 매 render마다 고유 ID 보장.

---

## viewerStore setFile ↔ goBack/goForward 히스토리 파괴 — 2026-05-26

**Symptom:** 뒤로 가기가 한 번만 됨. 앞으로 가기 불가.

**Root cause:** `goBack()`이 historyIndex를 이동한 후 호출부가 `setFile`을 호출 → `truncateAndAppend(history, newIndex, path)`가 새 인덱스 기준으로 경로를 재추가 → 앞 히스토리 잘림.

**Correct fix:** 히스토리 미변경 `loadFile(path, content)` 액션 분리. goBack/goForward 이후에는 반드시 `loadFile` 사용. `setFile`은 사용자가 파일 트리에서 클릭할 때만.

---

## 내부 MD 링크 이중 히스토리 추가 — 2026-05-26

**Symptom:** MD 내부 링크 클릭 시 히스토리에 같은 경로가 두 번 추가됨.

**Root cause:** `MarkdownRenderer.tsx`의 `onClick`에서 `navigateTo(abs)` + `setFile(abs, c)` 둘 다 호출.

**Correct fix:** `navigateTo` 호출 제거. `setFile`이 이미 `truncateAndAppend`로 히스토리 관리.

---

## Zustand no-selector = 전체 state 구독 — 2026-05-27

**Symptom:** 스크롤할 때마다 MermaidDiagram SVG 사라짐, CodeBlock collapsed 상태 리셋. 무한 재렌더 루프.

**Root cause:**
```ts
const { filePath, content, error, scrollPos, setScrollPos } = useViewerStore()
```
selector 없이 `useViewerStore()` 호출 → 전체 state 구독 → `scrollPos` 변경(매 스크롤)마다 리렌더 → MarkdownRenderer → ReactMarkdown 자식 언마운트/리마운트 → state 초기화.

**Failed attempts:** `getState()` 를 effect 내부에서 사용했지만 hook 호출 자체가 여전히 전체 구독 중.

**Correct fix:** 모든 state 접근을 개별 selector로 분리:
```ts
const filePath = useViewerStore((s) => s.filePath)
const setScrollPos = useViewerStore((s) => s.setScrollPos)
// scrollPos: 구독 제거, effect에서 getState() 사용
```

---

## ReactMarkdown components 참조 불안정 → 자식 언마운트 — 2026-05-27

**Symptom:** 부모 리렌더 시 CodeBlock/MermaidDiagram state(collapsed, svg) 초기화.

**Root cause:** `components` 객체를 render 함수 body에 직접 선언 → 매 렌더마다 새 함수 참조 → ReactMarkdown이 새 컴포넌트 타입으로 인식 → 언마운트+리마운트 → state 소멸.

**Correct fix:** `useMemo<Components>(() => ({...}), [filePath])` 로 메모이제이션. `filePath`만 deps — `a`/`img` 핸들러에서 상대경로 해석에 사용.

---

## node:sqlite Vite 정적 분석 실패 — 2026-05-27

**Symptom:** `import { DatabaseSync } from 'node:sqlite'` → `Error: Failed to load url sqlite`.

**Root cause:** Vite가 `node:` prefix를 제거하고 node_modules에서 `sqlite`를 찾으려 함. `node:sqlite`는 실험적 내장 모듈이라 Vite의 Node builtin 인식 목록에 없음.

**Failed attempts:** `server.deps.external: [/^node:/]` — 여전히 정적 import 분석 단계에서 실패.

**Correct fix:** `createRequire`로 런타임에 동적 로드:
```ts
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
const { DatabaseSync } = _require('node:sqlite')
```
Vite 빌드 타임 분석 우회.

---

## ESM import + `export =` (CJS) 혼용 오류 — 2026-05-27

**Symptom:** mock 파일에서 `ReferenceError: better_sqlite3_module is not defined`.

**Root cause:** ESM `import` 문과 `export = Database` (CommonJS 스타일) 혼용 → esbuild 트랜스파일 실패.

**Correct fix:** `export default Database` (순수 ESM). 테스트 코드의 `import Database from 'better-sqlite3'`는 default import이므로 호환.

---

## DOM TreeWalker — live NodeList 순회 중 삽입 금지 — 2026-05-27

**Symptom:** TreeWalker로 텍스트 노드 순회하며 `<mark>` 삽입 시 무한 순회 또는 mark 노드 자체를 재방문.

**Root cause:** TreeWalker가 live DOM 트리를 참조. 텍스트 노드 분리 후 mark 삽입하면 walker가 새 노드를 재방문.

**Correct fix:** 순회 먼저, 수집 후 처리:
```ts
const nodesToProcess: Text[] = []
while ((node = walker.nextNode())) nodesToProcess.push(node as Text)
// 수집 완료 후 mutate
for (const textNode of nodesToProcess) { ... }
```

---

## Global RegExp lastIndex — 파일 간 상태 오염 — 2026-05-27

**Symptom:** 두 번째 파일부터 일부 매칭 누락. `gi` 플래그 RegExp를 여러 파일에 재사용 시 발생.

**Root cause:** `gi` 플래그 RegExp는 `lastIndex`가 인스턴스에 저장됨. 한 파일 검색 완료 후 `lastIndex`가 0이 아닌 값이면 다음 파일 첫 줄에서 잘못된 위치부터 검색.

**Correct fix:** 파일마다 새 RegExp 인스턴스 생성:
```ts
const pattern = new RegExp(basePattern.source, basePattern.flags) // 파일마다 fresh
```
또는 각 줄 시작 전 `pattern.lastIndex = 0` 명시적 리셋.

---

## remarkPlugins/rehypePlugins 배열 useMemo 필수 — 2026-05-27

**Symptom:** MarkdownRenderer 부모 리렌더 시 CodeBlock/MermaidDiagram 언마운트 → state 소멸.

**Root cause:** `remarkPlugins={[remarkGfm]}` 인라인 배열은 렌더마다 새 참조 → ReactMarkdown이 props 변경으로 인식 → 자식 전체 리마운트.

**Correct fix:**
```ts
const remarkPluginsArr = useMemo(() => [remarkGfm], [])
const rehypePluginsArr = useMemo(() => [rehypeRaw, rehypeSlug], [])
// as const 금지 — Pluggable[] 타입과 readonly 호환 안 됨
```

---

## clearMarks normalize() — 루프 내 호출 O(n²) → Set 패턴 — 2026-05-27

**Symptom:** mark 다수인 단락에서 normalize() 반복 호출로 불필요한 DOM 재계산.

**Root cause:** `forEach mark → parent.normalize()` 패턴에서 같은 parent를 N번 normalize.

**Correct fix:**
```ts
const parents = new Set<Node>()
marks.forEach(mark => { ...; parents.add(mark.parentNode) })
parents.forEach(p => (p as Element).normalize())
```

---

## Tailwind 하드코딩 hex vs CSS 변수 테마 — 2026-05-26

**Symptom:** `bg-base` 등이 테마 전환 후에도 Mocha(dark) 색상 유지.

**Root cause:** `tailwind.config.ts` colors에 hex 직접 작성 → 빌드 타임 정적 값. 테마 CSS 변수 변경 반영 안 됨.

**Correct fix:** 모든 color를 `var(--color-*)` 참조로 교체. Tailwind JIT가 런타임 CSS 변수를 그대로 사용.
