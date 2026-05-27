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

## M4 · 프로젝트 탐지 고도화 🔎 `feat/m4-detection` ✅

> `analyzer.ts`의 단순 규칙 → Confidence 기반 다중 기술 스택 탐지 시스템.

**Completed: 2026-05-27 15:00** | Work-log: `docs/work-logs/2026-05-27-milestone-4-detection.md`

### 완료 항목

**탐지 엔진 (`src/main/detector/`)**
- [x] Confidence 점수 시스템 (Evidence 기반 합산, 72개 룰)
- [x] 72개 룰: GameEngine×5 (Unity/Unreal/Godot/GameMaker/RPGMaker), Desktop×4, Frontend×12, Backend×14, Mobile×4, AI×5, DevOps×4, Monorepo×3, Docs×5, Language×16
- [x] DependencyAnalyzer: package.json, requirements.txt, pyproject.toml, Cargo.toml, .csproj
- [x] 빌드 시스템 탐지: Vite, Webpack, Turbopack, Maven, Gradle, MSBuild, CMake
- [x] 패키지 매니저 탐지: npm/yarn/pnpm/bun/cargo
- [x] Monorepo 탐지: Nx, Turborepo, Lerna

**결과 구조 확장**
- [x] `primaryType` + `frameworks[]` + `confidence` + `evidence[]` + `warnings[]`
- [x] 기존 `ProjectType` 호환 유지 (DB 스키마 변경 없음)
- [x] 새 ProjectType: go, java, php, ruby, dart, cpp, csharp

**UI 반영**
- [x] TitleBar: frameworks 배지 목록 (최대 3개 + N개 초과 표시)
- [x] confidence < 50 → `?` 배지
- [x] GET_APP_STATE: 스타트업 시 모든 기존 프로젝트 재분석

**테스트**
- [x] 26개 detector 통합 테스트, 67/67 전체 통과

**Handoff Note (2026-05-27 15:00):**
Confidence 기반 72룰 탐지 시스템 완전 구현. `src/main/detector/`가 독립 모듈로 존재하며 `src/main/analyzer.ts`는 레거시로 유지(구버전 테스트 참조). GET_APP_STATE가 스타트업 시 모든 프로젝트 재분석하므로 frameworks는 항상 최신. M5는 배포 준비 — `build/` 디렉토리 비어있고 `electron-builder.config.ts` 기본 구조만 존재. work-log: `docs/work-logs/2026-05-27-milestone-4-detection.md`

---

## M5 · 배포 준비 📦 `feat/m5-deploy` ✅

> Windows / macOS / Linux 3개 플랫폼 패키징 + 자동 업데이트 + CI/CD.

**Completed: 2026-05-27** | Release: [v1.0.0](https://github.com/DIMBD-AKE/Markdown-Organizer/releases/tag/v1.0.0)

### 완료 항목

**아이콘 & 앱 메타데이터**
- [x] 앱 아이콘 (build/icon.png 1254×1254)
- [x] electron-builder.config.ts: appId, copyright, productName, publish, dmg, nsis, linux 설정
- [x] package.json: author, homepage, repository, electron-updater 의존성

**패키징**
- [x] macOS: DMG (arm64 + x64)
- [x] Windows: NSIS 인스톨러 (x64)
- [x] Linux: AppImage (x64)
- [x] better-sqlite3 asarUnpack (네이티브 모듈)

**자동 업데이트**
- [x] `electron-updater` IPC 통합 (7개 채널: check/install/available/not-available/progress/downloaded/error)
- [x] 앱 시작 5초 후 자동 확인
- [x] 설정 패널 업데이트 UI (7-state: idle→checking→available→downloading→ready→error)

**CI/CD**
- [x] `.github/workflows/release.yml`: v* 태그 push → macOS/Windows/Linux 병렬 빌드
- [x] `.github/workflows/ci.yml`: push/PR 자동 테스트 + 빌드 검증 (Node 22)
- [x] `scripts/python` 래퍼: macOS DMG 빌더 Python 경로 fix

**배포 안정화 (post-M5 hotfix)**
- [x] CI Node 20→22 (node:sqlite 지원)
- [x] Release 워크플로 코드사이닝 환경변수 제거 (CSC_LINK 빈값 → "not a file" 에러)
- [x] Linux deb → AppImage only (deb가 Snap Store 자동 publish 트리거)
- [x] fail-fast: false (플랫폼별 독립 실행)

**Handoff Note (2026-05-27):**
v1.0.0 GitHub Release 배포 완료 (macOS DMG, Windows exe, Linux AppImage). 배포 후 크로스플랫폼 테스트에서 버그 확인 → M6로 이관. 코드사이닝 없는 무서명 빌드 — macOS arm64에서 "손상된 파일" 오류 발생, 커스텀 타이틀바 환경에서 macOS 창 조작 불가. work-log: `docs/work-logs/2026-05-27-milestone-5-deploy.md`

---

## M6 · 크로스플랫폼 안정화 🔧 `feat/m6-stability`

> v1.0.0 실배포 후 확인된 크로스플랫폼 버그 수정 + 포터블 빌드.

### 버그

**Windows**
- [ ] 프로젝트 등록/오픈, 문서 클릭 시 일시적 렉
  - 원인 추정: main 프로세스 SQLite 동기 I/O 또는 chokidar 파일워처 Windows 폴링 지연
  - 방향: IPC 핸들러 병목 프로파일링 → async 분리 또는 워커스레드 이관

**macOS**
- [ ] "손상된 파일" 오류 — 실행 불가
  - 원인: arm64 무서명 바이너리 → Gatekeeper 차단
  - 방향: CI에서 ad-hoc 코드사이닝 (`codesign -s -`) 적용
- [ ] 트래픽 라이트(창 컨트롤) 부재
  - 원인: 커스텀 타이틀바(`frame: false`)에서 macOS 네이티브 버튼 비표시
  - 방향: `titleBarStyle: 'hiddenInset'` + `trafficLightPosition` 설정, 또는 커스텀 버튼 UI 구현

**공통**
- [ ] README 깃허브 배지 미표시
  - 방향: 저장소 공개 여부 및 배지 URL 확인
- [ ] 버전 체크 404 에러
  - 방향: v1.0.0 릴리즈 publish 이후 `latest.yml` 접근 경로 재확인

### 요구 사항

**저자 표기**
- [x] 앱 저자 `이드림` → `DIMBD-AKE` (package.json author.name, electron-builder copyright)

**포터블 빌드 (설치 불필요)**
- [ ] Windows: NSIS 인스톨러 → portable exe 추가 (설치 없이 바로 실행)
  - `electron-builder`: `win.target`에 `{ target: 'portable', arch: ['x64'] }` 추가
- [ ] macOS: DMG는 이미 포터블 (드래그 없이 DMG 내에서 바로 실행 가능) ✅
- [ ] Linux: AppImage는 이미 포터블 ✅

### 우선순위

| 순위 | 항목 | 영향도 |
|------|------|--------|
| P0 | macOS 손상 파일 | macOS 사용자 전체 실행 불가 |
| P0 | macOS 트래픽 라이트 | 창 닫기/최소화 불가 |
| P1 | Windows 렉 | 핵심 UX 저하 |
| P1 | Windows 포터블 exe | 설치 없는 배포 |
| P2 | 버전 체크 404 | 자동업데이트 오작동 |
| P3 | 배지 미표시 | README 시각적 문제 |

---

## 이후 고려 항목 (미정)

- 탭 시스템 (멀티 문서 열람)
- Git 연동 (변경 파일 강조, 브랜치 표시)
- AI 연동 (문서 요약, 오래된 내용 검출)
- 문서 그래프 (Obsidian 스타일)
- 커스텀 테마 / 사용자 CSS
