# Changelog

All notable changes to Markdown Organizer are documented here.

## [1.2.4] — 2026-06-19

### Fixed
- **목차 — 코드 블록 안의 마크다운 헤딩 오인식** — TOC 추출기가 원본 마크다운 전체를 `^#` 정규식으로 훑어, 펜스 코드 블록(```` ``` ````/`~~~`) 안에 들어 있는 `# 제목` 줄까지 실제 헤딩으로 잡아 잘못된 목차 항목을 만들었음. 코드 블록 영역을 줄 단위로 추적해 그 안의 헤딩은 건너뛰도록 수정. 렌더러는 애초에 코드 블록 텍스트를 슬러그하지 않으므로, 가짜 헤딩 제거로 슬러그 ID 정합성도 함께 개선됨.

## [1.2.3] — 2026-06-13

### Changed
- **가상 그룹화 — 연/월/일 중첩** — 기존엔 한 폴더의 날짜 종류가 12개를 넘을 때만 월 단위로 묶었음. 이제 날짜 개수와 무관하게, 파일이 2개 이상의 달에 걸치면 `월 → 일`로 중첩 그룹화하고(예: `2026-05/ → 2026-05-12/`), 2개 이상의 연도에 걸치면 `연 → 월 → 일`로 묶음. 같은 달 안에서는 종전처럼 일 단위 평면 그룹 유지.

### Fixed
- **자동 업데이트 — 패키지 다운로드 404** — `productName`("Markdown Organizer")의 공백이 GitHub 릴리스 에셋 업로드 시 점(`.`)으로 치환돼, `latest*.yml`이 가리키는 하이픈 파일명(`Markdown-Organizer-…`)과 실제 에셋(`Markdown.Organizer-…`)이 어긋났음. 업데이트 매니페스트는 읽히지만 패키지 다운로드가 404 → updater가 404를 "업데이트 없음"으로 처리해 조용히 실패. 모든 플랫폼 `artifactName`을 공백 없는 하이픈 형식으로 고정해 yml url과 에셋명을 일치시킴.

## [1.2.2] — 2026-06-12

### Fixed
- **검색으로 이동 시 검색어 위치로 점프 안 됨** — 스크롤 위치가 저장돼 있던 문서를 검색 결과로 열면 검색어 위치로 이동하지 않던 문제. 문서를 열 때마다 전역 저장 스크롤값을 복원하는 동작이 검색어로 스크롤하는 동작(`scrollIntoView`)을 덮어쓰고 있었음(React가 자식 effect를 부모보다 먼저 실행 → 부모의 스크롤 복원이 나중에 실행돼 검색 점프를 무효화). 검색으로 연 문서(활성 검색 대상 + 검색어 존재)에서는 스크롤 복원을 건너뛰도록 수정.

## [1.2.1] — 2026-06-09

### Changed
- **가상 그룹화 — 포맷 기준 그룹화** — 기존엔 같은 날짜 키가 2개 이상일 때만 그룹을 만들어, 한 폴더에 날짜 파일이 여럿이어도 1개뿐인 날짜는 묶이지 않았음. 이제 한 폴더에 날짜 포맷 파일이 2개 이상이면 모든 날짜가 각각 그룹화됨(1개짜리 날짜 포함). 폴더에 파일이 하나뿐이면 그대로 둠.

### Added
- **설정 — 앱 버전 표시** — 설정 패널 업데이트 섹션에 현재 버전(`v1.2.1`) 상시 표시. 업데이트 확인 시 발견된 최신 버전 번호를 함께 안내.
- **테마 — Claude / Codex 추가** — 따뜻한 크림 + 코랄 액센트(Claude, 라이트)와 near-black + teal 액센트(Codex, 다크) 테마 추가. AN-PIP와 동일한 팔레트로 세트 구성.

### Fixed
- **자동 업데이트 메타데이터 누락 (재수정)** — 릴리스 워크플로가 발행된(non-draft) 릴리스를 먼저 만든 뒤 `electron-builder --publish always`를 실행하는데, electron-builder의 기본 `publishingType=draft`가 기존 발행 릴리스와 호환되지 않아 `latest*.yml` 업로드를 전부 건너뛰었음(설치 파일만 별도 수동 업로드 스텝으로 올라가던 상황). 수동 업로드 스텝에 `latest*.yml`·`*.blockmap` glob을 추가해 매니페스트가 릴리스에 함께 업로드되도록 수정.

## [1.2.0] — 2026-06-07

### Added
- **파일 브라우저 정렬** — 이름(자연 정렬, `2 < 10`)·날짜 기준 + 오름/내림차순 드롭다운 2개. 폴더 우선 정렬. 설정 영속(전역).
- **가상 그룹화 토글** — 실제 파일 이동 없이 파일명 패턴을 인식해 표시용 가상 폴더 구성. 날짜 접두사(여러 포맷 → `YYYY-MM-DD` 정규화)·공통 접두사 자동 감지, 같은 키 2개 이상일 때만 그룹, 날짜 그룹이 많으면 월 단위로 자동 롤업.
- **문서 목차 트리뷰** — 헤딩 접기/펴기(chevron) + 들여쓰기 가이드 라인. 활성 헤딩의 상위 항목 자동 전개. 접힘 상태는 문서별 초기화.

### Fixed
- **자동 업데이트 동작 안 함** — 릴리스에 `latest*.yml` 업데이트 메타데이터가 없어 업데이터가 버전 비교 불가(공개 전환 후에도 404로 무시)였던 문제. 릴리스 빌드를 `--publish always`로 전환하고 CI 빌드 스텝에 `GH_TOKEN`을 추가해 `latest*.yml`이 릴리스에 함께 업로드되도록 수정.
- **문서 뷰어가 파일 탐색에 묶여 멈춤** — 대형(Unity) 프로젝트로 전환 시, 이미 목록에 보이는 파일을 눌러도 폴더 스캔이 끝나야 내용이 표시되던 문제. 스트림 이벤트를 프레임당 1회로 합쳐(coalescing) 렌더러 메인스레드 부하를 줄여 클릭 즉시 본문이 표시되도록 분리. 스캔 중 로딩바·스피너 표시 추가, 뷰어 자체 로딩 상태 분리.
- **프로젝트 전환 경로 불일치** — 좌측 아이콘바 전환이 블로킹 방식으로 전체 스캔이 끝날 때까지 패널을 멈추고 뷰어/선택을 초기화하지 않던 문제. 상단 드롭다운과 동일한 스트리밍 방식으로 통일.

## [1.1.8] — 2026-05-29

### Fixed
- **한글 등 유니코드 경로 하이퍼링크 오작동** — `react-markdown`이 href를 퍼센트 인코딩(`%EC%B4%88%EC%95%88.md`)으로 전달하지만 `fs.readFile`은 실제 파일명을 기대함. 클릭 핸들러에서 `decodeURIComponent` 적용으로 해결.
- **디렉토리 링크 클릭 시 화면 날아감** — `.md` 파일이 아닌 로컬 링크(디렉토리 경로 등) 클릭 시 `e.preventDefault()` 누락으로 Electron 렌더러가 URL 탐색 시도 → 빈 화면. 이제 디렉토리 링크는 기본 탐색을 차단하고 좌측 파일 트리에서 해당 디렉토리를 강조 표시.
- **하이퍼링크 이동 후 파일 트리 싱크 없음** — 마크다운 내 링크로 다른 문서로 이동 시 좌측 파일 브라우저 선택 항목이 업데이트되지 않던 문제. 이제 링크 클릭으로 문서 오픈 시 `setSelectedFile` 호출 + 상위 디렉토리 자동 전개 + 해당 항목으로 스크롤. 디렉토리 링크도 강조 표시 지원(파일/디렉토리 구분 없이 `selectedFile` 기준 하이라이트).

## [1.1.7] — 2026-05-28

### Fixed
- **Windows 워처 startup 렉 (근본 제거)** — chokidar가 dotfile 외에는 모든 파일을 감시 등록하면서 `node_modules`/`Library`/`Temp`/`obj` 등을 전부 스캔. 사용자의 Unity 프로젝트(Project-World)에서 `startWatcher` 한 번이 **9524 ms** 동안 main thread를 blocking. `EXCLUDED_DIRS` + `UNITY_EXCLUDED` + `.md`-only 필터를 chokidar `ignored`에 통합하여 동일 프로젝트에서 **391 ms** 로 단축 (24배). `isUnityProjectSync`로 워처 startup 시점 동기 감지.
- **빈 폴더가 트리뷰에 남는 문제** — M9 progressive streaming은 폴더를 발견 즉시 emit하느라 마크다운이 없는 폴더도 노출. `streamFileTree` 주석에 "Renderer can hide them post-COMPLETE if needed"로 미완으로 남았던 부분을 `pruneEmptyDirs`로 마무리. `completeStream()`이 트리를 재귀 walk 하면서 mdCount==0 디렉터리를 제거하고 모든 살아남은 dir의 recursive mdCount를 재계산.
- **윈도우 네이티브 타이틀바 오버레이 테마 미반영** — `BrowserWindow.titleBarOverlay`가 윈도우 생성 시점에 `#1e1e2e`/`#cdd6f4`로 하드코딩되어 dark↔black↔latte 전환 시 우측 138px 네이티브 영역만 변하지 않음. `SET_TITLE_BAR_OVERLAY` IPC + `win.setTitleBarOverlay()` 호출로 테마 전환마다 동적 갱신. 초기 색은 db의 영구 저장된 theme에서 읽어 적용 (launch flash 없음). 색상은 `--color-mantle`(헤더 실제 bg)에 정렬 — 기존 미세 미스매치도 함께 해소.

### Changed
- `src/main/projectFilters.ts` 신규 — `EXCLUDED_DIRS`/`UNITY_EXCLUDED`/`isUnityProjectSync` 공용화. `fs.ts`/`fileTreeStream.ts`/`watcher.ts`가 동일 상수 참조 → 트리 빌더와 워처의 필터 드리프트 방지.
- `shiki` 직접 dependency 추가 — pnpm 격리 환경에서 `@shikijs/rehype` transitive로는 `import 'shiki'` 미해소되던 문제.

### Tests
- 103 → 131 (pruneEmptyDirs 7, completeStream 1, mdCount recompute 1, search 20).
- `tsc --noEmit` clean (node + web), `electron-vite build` clean.

### Verification
- `scripts/profile-tree.cjs` / `scripts/profile-watcher.cjs` — Windows 환경에서 실측치 기록. 사용자 Unity 프로젝트(2923 dirs, 1114 md): 워처 9524ms → 391ms.

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
