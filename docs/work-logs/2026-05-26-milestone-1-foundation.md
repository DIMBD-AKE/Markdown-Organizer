# Milestone 1: 기반 구축 (Foundation)

**Branch:** `feat/implementation`
**Completed:** 2026-05-26 22:00
**Status:** Completed

---

## Purpose

앱의 핵심 골격 구축. 프로젝트 관리, Markdown 렌더링, 3단 레이아웃, 테마 시스템, 네비게이션 히스토리.

---

## What Was Built

**디자인 시스템**
- Catppuccin 3-테마 (Dark / Black / Latte) — 모든 색상을 CSS 변수(`var(--color-*)`)로 교체
- `tailwind.config.ts` colors 전체를 CSS 변수 참조로 변환 → 테마 전환 즉시 반영
- 폰트: Geist (sans), JetBrains Mono (mono), Literata Variable (serif, 준비)
- `@fontsource/geist`, `@fontsource-variable/literata` 설치

**레이아웃**
- `TitleBar`: Rider 스타일 프로젝트 드롭다운, 유형 배지, WebkitAppRegion drag
- `Sidebar`: SVG 아이콘 탭 (파일/검색/설정), amber 액센트 활성 상태
- `ResizeHandle`: 3패널 (파일 브라우저/뷰어/목차) 너비 드래그 조절 + 설정 영구 저장
- `App.tsx`: width를 inline style로 제어, clamp(140–480px, 120–400px)

**파일 브라우저**
- MD 파일 없는 폴더 자동 제외 (재귀 `mdCount` 체크)
- Unity 프로젝트 자동 감지 (`Assets/` + `ProjectSettings/` 존재 여부) → `Library`, `Temp`, `Logs`, `obj`, `Build`, `Builds` 제외
- 파일 클릭 → `setFile` + `setSelectedFile` + `setError` (mountedRef 없음)

**문서 뷰어**
- `react-markdown@10` + `remark-gfm` + `rehype-raw` + `rehype-slug`
- `CodeBlock`: Shiki 문법 강조
- `MermaidDiagram`: 동적 import(IIFE), SVG React state + `dangerouslySetInnerHTML`
- `DocHeader`: 뒤로/앞으로 버튼, `loadFile` 사용, 신선도 배지 (fresh/warn/stale)
- 인라인 코드: `text-blue` 하이라이트
- 내부 MD 링크 클릭 시 `setFile` (navigateTo 제거 — 이중 히스토리 방지)
- 이미지: `file://` 절대경로로 변환

**네비게이션 히스토리**
- `viewerStore`: `setFile` (히스토리 추가) / `loadFile` (히스토리 유지) 분리
- `goBack()` / `goForward()` → historyIndex 이동 + path 반환 → 호출부에서 `loadFile`

**기타**
- `uiStore`: `sidebarTab`, theme 타입 `'dark' | 'black' | 'latte'`
- `docs/` 폴더 정리: DESIGN.md, README.md, ROADMAP.md
- `CLAUDE.md`: skill routing 규칙 추가

---

## Key Decisions

**react-markdown vs unified+rehype-react**
unified 파이프라인의 `processSync().result`가 Electron Vite 번들에서 jsx/jsxs 호환 오류 발생. react-markdown v10으로 교체. Components API로 code/pre/a/img 커스터마이징.

**SVG React state (dangerouslySetInnerHTML) vs ref.current.innerHTML**
Mermaid SVG를 ref.innerHTML로 주입하면 부모 리렌더(스크롤→setScrollPos→viewerStore) 시 React reconciler가 빈 div로 교체 → SVG 소멸 → 레이아웃 붕괴. React state에 SVG 문자열 저장 → 생존.

**loadFile 분리**
goBack/goForward이 historyIndex를 먼저 이동한 후 setFile을 호출하면 truncateAndAppend가 새 인덱스 기준으로 경로를 재추가 → 앞으로 가기 히스토리 파괴. loadFile은 history 불변 보장.

**ResizeHandle window 이벤트**
element mousemove는 빠른 드래그 시 커서가 패널 경계를 벗어나면 이벤트 유실. window mousemove 캡처로 해결.

---

## Errors and Corrections

1. **rehype-react jsx/jsxs 호환 오류** → unified 파이프라인 전체 제거, react-markdown v10 채택
2. **mountedRef StrictMode 영구 false**
   - `useEffect(() => () => { ref.current = false }, [])` — StrictMode에서 cleanup 실행 후 remount body 없어 ref 영영 false
   - 사용자가 "아직도 문서 클릭 갱신 안 된다"고 두 번 지적
   - mountedRef 전체 제거로 해결
3. **setFile이 뒤로/앞으로 히스토리 파괴**
   - goBack() 후 setFile() 호출 → truncateAndAppend가 이동한 인덱스 기준으로 경로 재추가 → 앞으로 가기 소멸
   - loadFile 액션 추가, DocHeader에서 loadFile 사용으로 해결
4. **Mermaid SVG 스크롤 후 소멸**
   - ref.current.innerHTML 방식 → 부모 리렌더 시 초기화
   - React state + dangerouslySetInnerHTML으로 교체
5. **Mermaid 동일 ID 충돌 (StrictMode)**
   - useRef로 고정 ID 생성 → StrictMode remount 시 같은 ID 재사용 → mermaid 내부 캐시 거부
   - effect 내부에서 `Math.random()` 기반 ID 생성으로 해결
6. **링크 클릭 이중 히스토리 추가**
   - `navigateTo(abs)` + `setFile(abs, c)` 두 번 호출
   - navigateTo 제거, setFile만 남김
7. **라이트 모드 freshness 배지 불가시**
   - Mocha(다크) 팔레트 기반 하드코딩 hex → latte에서 배지 배경색이 텍스트색과 유사
   - CSS 변수 기반 Tailwind 클래스(`text-green`, `bg-green/10`)로 교체

---

## Test Results

- **통과:** 16개 (unit/analyzer, unit/freshness, unit/toc-parser)
- **실패:** 5개 (unit/queries, integration/projects-ipc)
- **원인:** `better-sqlite3` 네이티브 모듈이 Electron Node(`MODULE_VERSION 125`)로 컴파일됨. 시스템 Node(`141`)에서 vitest 실행 시 `ERR_DLOPEN_FAILED`. M1 이전부터 존재하는 문제. M2에서 수정 예정.

---

## Session Continuity Note

M1 완료 후 코드베이스 상태:
- 앱 실행 및 프로덕션 빌드 정상 (`npm run build` 통과)
- TypeScript 타입 체크 통과 (`npx tsc --noEmit`)
- SQLite 의존 테스트 5개 실패 — vitest가 시스템 Node에서 실행되는데 better-sqlite3가 Electron Node 버전으로 빌드된 상태. 앱 자체는 정상 동작.
- M2에서 해결해야 할 주요 버그 3종: Mermaid 불안정, 코드 블록 미완, 파일 트리 ↔ 뷰어 네비게이션 동기화
- 관련 work-log: 이 파일
