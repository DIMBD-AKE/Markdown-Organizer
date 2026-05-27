# Lessons Learned

---

## electron-builder v24 config 파일명 — `.config.` prefix 탐색 안 됨 — 2026-05-28

**Symptom:** `electron-builder.config.ts` (또는 `.config.cjs`) 존재해도 electron-builder가 기본값 사용. Windows: NSIS, macOS: zip+DMG, Linux: snap+AppImage.

**Root cause:**
`app-builder-lib` 내부에서 `configFilename: "electron-builder"` prefix만 탐색:
```
electron-builder.yml / .yaml / .json / .json5 / .toml / .js / .cjs / .ts
```
`electron-builder.config.*` 형식은 탐색 대상 아님. `.config.ts`가 로드 안 된 것도 동일 이유.

**Failed attempts:**
1. `electron-builder.config.ts` — 처음부터 로드 안 됨 (파일명 오류 + sucrase 실패 복합)
2. `electron-builder.config.cjs` — CJS 변환은 맞았으나 파일명 prefix 오류로 여전히 탐색 안 됨

**Correct fix:** `electron-builder.cjs` (`.config.` 없이). CommonJS, sucrase 불필요.

**config 로드 실패 확인법:** CI 로그에서 실제 타겟 출력 확인. `target=nsis` (기본값) → config 로드 실패. `target=portable` → config 로드 성공.

---

## electron-builder `onTagOrDraft` — GH_TOKEN 없어도 자동 publish 시도 — 2026-05-27

**Symptom:** CI build step에서 `GH_TOKEN` 제거해도 `"artifacts will be published reason=tag is defined"` 로그 후 실패. Windows: `GitHub Personal Access Token is not set`. Linux: `snapcraft is not installed`.

**Root cause:** electron-builder 기본 publish 모드는 `onTagOrDraft`. git tag가 존재하면 `--publish always` 없이도 자동 publish 시도.

**Failed attempts:** build step env에서 `GH_TOKEN` 제거 — 효과 없음.

**Correct fix:** 빌드 스크립트에 `--publish never` 명시. CI 전용 `release:mac/win/linux` 스크립트 생성.

---

## CSP `img-src`에 `file:` 누락 — 로컬 이미지 전부 차단 — 2026-05-28

**Symptom:** 뷰어에서 로컬 마크다운의 `![]` 이미지 전부 렌더 불가. `file://` URL 생성 로직은 정상.

**Root cause:** `src/renderer/index.html` CSP: `img-src 'self' data: blob:` — `file:` scheme 누락. `file://` URL 요청이 CSP에 의해 차단.

**Correct fix:** `img-src 'self' data: blob: file: https:` 로 확장.

---

## Windows `filePath` 백슬래시 — `lastIndexOf('/')` 실패 — 2026-05-28

**Symptom:** Windows에서 뷰어 이미지 렌더 불가. `file:///` URL 대신 `file:///image.png` (경로 없음) 생성.

**Root cause:** Windows `filePath` = `C:\Users\...\README.md`. `lastIndexOf('/')` = -1 → `base = ''` → 잘못된 URL.

**Correct fix:** `filePath.replace(/\\/g, '/')` 로 정규화 후 처리. Windows 경로(`C:/...`): `absBase = '/' + base` 로 `file:///C:/...` 형태 생성.

---

## `analyzeDirectory` sync → async 전환 시 테스트 업데이트 필수 — 2026-05-28

**Symptom:** `analyzeDirectory` async 전환 후 detector 테스트 26개 전부 실패. `result.primaryType`이 `undefined`.

**Root cause:** 테스트에서 `const result = analyzeDirectory(dir)` — Promise를 받아서 `.primaryType` 접근 → `undefined`.

**Correct fix:** 테스트 callback `async`, `const result = await analyzeDirectory(dir)`. sed로 일괄 치환 가능.

---

## electron-builder `mac.identity: null` vs `CSC_IDENTITY_AUTO_DISCOVERY: false` — 2026-05-28

**Symptom:** 로컬 macOS 빌드: `codesign --sign <real-cert> ... locale.pak: Operation not permitted`. CI는 정상.

**Root cause:** CI에서는 `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` env 설정됨. 로컬에서는 이 env 없음 → electron-builder가 keychain에서 실제 인증서 발견 → deep signing 시도 → locale.pak 권한 오류.

**Correct fix:** `electron-builder.config.ts`에 `mac.identity: null` 추가. env 설정 불필요. afterPack ad-hoc 서명과 병행. `--deep` 플래그도 제거(locale.pak 등 nested 파일 권한 오류 방지).

---

## electron-builder CSC_LINK 빈값 → "not a file" 에러 — 2026-05-27

**Symptom:** GitHub Actions release 워크플로에서 macOS 빌드 실패. `"CSC_LINK" is not a file`.

**Root cause:** `CSC_LINK: ${{ secrets.CSC_LINK }}` — 시크릿 미설정 시 빈 문자열. electron-builder가 빈 문자열을 파일 경로로 해석.

**Correct fix:** CSC 관련 env 전체 제거 + `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` 추가. 코드사이닝 없이 빌드.

---

## electron-builder Linux deb → Snap Store 자동 publish 트리거 — 2026-05-27

**Symptom:** `['AppImage', 'deb']` 타겟 빌드 시 snapcraft 미설치로 실패.

**Root cause:** electron-builder 24.x가 deb 타겟 존재 시 Snap Store 자동 publish 시도.

**Correct fix:** deb 제거, AppImage only (`{ target: 'AppImage', arch: ['x64'] }`).

---

## macOS DMG 빌더 `python` 경로 문제 — 2026-05-27

**Symptom:** 로컬 macOS 빌드: `which python` 실패. Homebrew Python 3.14: `ImportError: dlopen(pyexpat...)`.

**Root cause:** dmg-builder가 `python` 호출. 현대 macOS에 `python` 없음. Homebrew Python은 libexpat 버전 불일치.

**Correct fix:** `scripts/python` 래퍼 → `/usr/bin/python3` (시스템 Python 3.9) + `build:mac` 스크립트에서 `PATH="$PWD/scripts:$PATH"` 앞에 추가.

---

## GitHub Release Draft 상태 — 워크플로 부분 실패 시 — 2026-05-27

**Symptom:** 아티팩트는 업로드됐으나 Release가 Draft로 남음.

**Root cause:** 워크플로 중간 단계 실패 → `draft: true` 상태에서 멈춤.

**Correct fix:** `gh release edit v1.0.0 --draft=false`로 수동 publish. 또는 워크플로에 `draft: false` 명시.

---

## Rule 점수 합산 시 기본 가정 검증 필수 — 2026-05-27

**Symptom:** Electron+React 복합 프로젝트 테스트에서 Electron이 더 높은 점수일 것으로 가정했으나 React가 더 높음.

**Root cause:** React 룰에 `*.tsx` glob(+20) + `src/App.tsx` fileExists(+15) + `package.json`(+10) 있어서, 테스트 픽스처에 해당 파일 모두 생성하면 React = 100점, Electron = 90점.

**Correct fix:** 점수 기반 탐지 테스트에서 순서 assertion 대신 포함 여부만 검증. 순서가 중요하면 테스트 픽스처에서 특정 파일을 의도적으로 제외해야 함.

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
