# Markdown Organizer — Roadmap

## M1 · 기반 구축 ✅ `feat/implementation`

> 앱의 핵심 골격 완성. 프로젝트 관리, 문서 렌더링, 레이아웃 시스템.

### 완료 항목

**디자인 시스템**
- Catppuccin 3-테마 (Dark / Black / Latte) — CSS 변수 기반 완전 교체
- 폰트: Geist (산세리프 UI), JetBrains Mono (코드), Literata Variable (지원 준비)
- Tailwind 컬러 전체를 `var(--color-*)` 로 교체 → 테마 전환 즉시 반영

**레이아웃**
- TitleBar: Rider 스타일 프로젝트 드롭다운 + 유형 배지 + 드래그 영역
- Sidebar: 아이콘 탭 (파일 / 검색 / 설정)
- 3단 패널 (파일 브라우저 / 뷰어 / 목차) — ResizeHandle 드래그 + 너비 영구 저장

**파일 브라우저**
- MD 파일이 없는 폴더 자동 제외
- Unity 프로젝트: `Library`, `Temp`, `Logs`, `obj`, `Build` 자동 제외
- 프로젝트 유형 자동 감지 (Unity / Unreal / Node / Rust / Python / AI / Docs)

**문서 뷰어**
- react-markdown v10 + remark-gfm + rehype-raw + rehype-slug
- CodeBlock: 문법 강조 (Shiki)
- MermaidDiagram: 동적 import + SVG React state 저장 (스크롤 안전)
- DocHeader: 뒤로/앞으로 버튼 + 신선도 배지 (fresh / warn / stale)
- 인라인 코드: 파란색 하이라이트
- 내부 링크 클릭 시 문서 이동 (히스토리 정상 관리)

**내비게이션 히스토리**
- `setFile` (히스토리 추가) / `loadFile` (히스토리 유지) 분리
- 뒤로/앞으로 클릭 → 올바른 인덱스 이동

**Handoff Note (2026-05-26 22:00):**
앱 실행 및 프로덕션 빌드 정상. 주요 렌더링 버그(Mermaid, StrictMode, 히스토리 파괴, 이중 히스토리, 테마 색상) 7건 수정 완료. SQLite vitest 테스트 5개는 Electron ↔ 시스템 Node ABI 불일치로 M1 이전부터 존재하는 실패 — 앱 동작 무관. M2에서 해결. 잔여 버그 3종(Mermaid 불안정, 코드 블록 미완, 파일 트리 nav 동기화)이 M2 목표. work-log: `docs/work-logs/2026-05-26-milestone-1-foundation.md`

---

## M2 · 버그 픽스 🐛 `fix/m2-polish` ✅

> M1에서 미완성된 렌더링 품질 및 UX 동기화 문제 해결.

**Completed: 2026-05-27 01:30** | Work-log: `docs/work-logs/2026-05-26-milestone-2-polish.md`

### 완료 항목

**Mermaid 렌더링 안정화**
- [x] 스크롤 시 SVG 사라지는 현상 — Zustand selector 분리 + useMemo(components) 로 재렌더 루프 차단
- [x] 하단 다이어그램 미렌더링 — 동일 원인 해결
- [x] initialize 위치 최적화 — 렌더마다 appTheme 기반 호출 (latte↔dark 동적 전환)
- [x] not-prose 래퍼 추가

**코드 블록 개선**
- [x] 복사 버튼 추가
- [x] 언어 배지 표시
- [x] 긴 코드 접기/펼치기 (40줄 임계값)
- [x] not-prose 래퍼 (prose margin 차단)
- [x] 스크롤 시 접기 상태 리셋 — Zustand selector 분리로 해결

**내비게이션 동기화**
- [x] 뒤로/앞으로 클릭 시 좌측 파일 트리 선택 항목 동기화
- [x] 파일 트리 자동 스크롤 (virtualizer.scrollToIndex)
- [x] 조상 디렉터리 자동 펼침
- [x] 프로젝트 전환 시 히스토리 초기화 (clearForProjectSwitch)

**테스트 인프라**
- [x] `better-sqlite3` vitest ABI 불일치 — node:sqlite wrapper (createRequire 패턴)
- [x] 21/21 통과

**프로젝트 관리 (보너스)**
- [x] 프로젝트 삭제 버튼 (TitleBar 드롭다운)
- [x] Finder 열기 버튼 (TitleBar 헤더)
- [x] 파일 워처 — 프로젝트 전환 시 startWatcher IPC로 재시작

**UX 픽스**
- [x] 텍스트 드래그 불가 (select-none 전체 적용) → select-text override
- [x] 파일 트리 화살표 크기 13px로 증가

**Handoff Note (2026-05-27 01:30):**
앱 실행/빌드 정상, 21/21 테스트 통과. 핵심 패턴 확립: Zustand 개별 selector 필수, ReactMarkdown components useMemo 필수, SQLite 테스트는 node:sqlite wrapper 사용. M3 검색 기능 명세는 `docs/side-search.md` 참고. 다음 세션 시작 전 `docs/work-logs/2026-05-26-milestone-2-polish.md` + LESSONS_LEARNED.md 확인.

---

## M3 · 검색 기능 🔍 `feat/m3-search` ✅

> 빠른 문서 탐색. Sidebar "검색" 탭 완성.

**Completed: 2026-05-27 11:00** | Work-log: `docs/work-logs/2026-05-27-milestone-3-search.md`

### 완료 항목

**IPC 검색 엔진**
- [x] `src/main/ipc/search.ts` — `collectMdFiles` + `searchInLoadedFiles` 순수 함수 + IPC 핸들러
- [x] `.md` + `.markdown` 확장자 지원
- [x] 문자열/Regex 양 모드, 대소문자 무시 (`gi` 플래그)
- [x] 와일드카드 지원: `*` → `.*`, `?` → `.` (string 모드)
- [x] async `Promise.allSettled` 병렬 파일 읽기 (성능 최적화)
- [x] invalid regex → `{ error: 'invalid_regex' }` 반환
- [x] matchCount 내림차순 정렬, 미리보기 최대 3개

**상태 관리**
- [x] `searchStore.ts` — query/mode/scope/results/isSearching/error + in-viewer 하이라이트 상태
- [x] `totalMatchCount` — DOM 탐색으로 발견한 실제 매칭 수 (DocHeader 카운터용)

**SearchPanel UI**
- [x] 검색어 입력 (Enter 실행), scope 라디오 (현재/전체), mode 라디오 (문자열/Regex)
- [x] 결과 목록: 프로젝트 이름 + 컨텍스트 스니펫 + `N건 일치` 배지
- [x] 결과 클릭 → 파일 열기 + 뷰어 하이라이트 활성화
- [x] 빈 검색어 / 결과 없음 / 오류 / 로딩 상태 처리
- [x] Cmd+F / Ctrl+F 전역 단축키 → 검색 탭 포커스

**In-viewer 하이라이트**
- [x] DOM TreeWalker + DocumentFragment으로 `<mark class="search-mark">` 삽입
- [x] 현재 매칭: `mark-current` 클래스 (amber 강조) + auto-scroll
- [x] 매칭 변경 시 reconciler 충돌 없는 순수 DOM 조작
- [x] `clearMarks` — unique parent Set 기반 `normalize()` (O(n) 최적화)

**DocHeader 내비게이션**
- [x] `[N/M] [↑] [↓] [×]` — 검색 활성 시 표시
- [x] Zustand 전체 구독 버그도 함께 수정 (DocHeader 리렌더 최적화)

**테스트**
- [x] 41/41 통과 (search.test.ts 20개 포함: string/regex/wildcard/empty/error/sort)

**Handoff Note (2026-05-27 11:00):**
검색 기능 완전 구현. IPC → Store → UI → 뷰어 하이라이트 → DocHeader 내비게이션 전 파이프라인 동작. 핵심 패턴: TreeWalker로 텍스트 노드 먼저 수집 후 mark 삽입(live NodeList 회피), remarkPlugins/rehypePlugins 배열 useMemo 필수(MarkdownRenderer 리마운트 방지), Zustand 개별 selector 필수(DocHeader에도 동일 적용). M4는 프로젝트 탐지 시스템 고도화 — `docs/project-detection-planning.md` + `src/main/analyzer.ts` 참고.

---

## M4 · 프로젝트 탐지 고도화 🔎 `feat/m4-detection`

> `analyzer.ts`의 단순 규칙 → Confidence 기반 다중 기술 스택 탐지 시스템.

### 예정 항목

**탐지 엔진**
- [ ] Confidence 점수 시스템 (Evidence 기반 합산)
- [ ] Phase 1 기술 스택: Unity, Unreal, Godot / React, Vue, Next.js, Angular, Svelte, Astro / Electron, Tauri / Express, NestJS, Spring Boot, Django, Flask, FastAPI / Flutter, React Native / Jupyter, PyTorch / Docker
- [ ] DependencyAnalyzer: `package.json`, `.csproj`, `requirements.txt`, `Cargo.toml` 파싱
- [ ] 빌드 시스템 탐지: Vite, Webpack, Gradle, Maven, Cargo, CMake
- [ ] 패키지 매니저 탐지: npm/yarn/pnpm/bun/NuGet/cargo
- [ ] Monorepo 기초 탐지: Nx, Turborepo, pnpm/yarn workspace

**결과 구조 확장**
- [ ] `primaryType` + `frameworks[]` + `confidence` + `evidence[]` + `warnings[]`
- [ ] 기존 `ProjectType` 호환 유지 (DB 스키마 변경 없음)

**UI 반영**
- [ ] TitleBar 배지: 기술 스택 목록 표시 (React · Vite · Electron)
- [ ] 신뢰도 낮음 경고 (confidence < 50 시 `?` 배지)

---

## 이후 고려 항목 (미정)

- 탭 시스템 (멀티 문서 열람)
- Git 연동 (변경 파일 강조, 브랜치 표시)
- AI 연동 (문서 요약, 오래된 내용 검출)
- 문서 그래프 (Obsidian 스타일)
- 커스텀 테마 / 사용자 CSS
