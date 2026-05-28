# Milestone 9: UX Continuity + Distribution Refinement

**Branch:** `feat/m9-ux`
**Created:** 2026-05-28
**Status:** In Progress

---

## Context (Read This First)

State after M8 (v1.1.5):

- macOS Gatekeeper 에러 변화: "손상된 파일" → "Apple이 악성 코드 없음을 확인할 수 없습니다"
  - M8의 selective deep ad-hoc codesign이 **기술적으로 동작**: signature 자체는 valid.
  - 그러나 ad-hoc sign은 Notarization이 아님 → Gatekeeper는 여전히 거부 (macOS Sequoia 15.x 이후 엄격).
  - 근본 해결: Apple Developer ID + notarytool (별도 마일스톤, 비용 $99/year). M9는 우선 우회.
- Windows lag: M8 Semaphore(8)으로 I/O storm 차단했으나 UX 관점에서는 여전히 "한번에 await → 멈춤" 느낌.
  - 사용자 직접 피드백: "프로그램이 멈춘다는 느낌이 없게 백그라운드로 폴더마다 로딩 표시"
- Windows portable: 시작 시 매번 `%TEMP%` 압축 해제 → 큰 빌드에서 느림.
  - 사용자 요청: portable + NSIS 둘다 제공.

Goal for M9: 사용자 체감 멈춤 0 + macOS/Windows 배포 형식 개선.

---

## Decisions (from user input 2026-05-28)

1. **macOS:** `dmg` → `zip` target. .app을 zip으로 직접 배포 (로컬 빌드와 동일 형태).
2. **Progressive load 전략:** Eager stream. CPU/IO보다 "안 멈추는 것"이 최우선. 백그라운드로 전체 트리를 비동기 빌드, 폴더별로 UI에 push.
3. **Loading UI:** 폴더 노드 우측에 작은 spinner (Catppuccin overlay 색).
4. **Windows:** portable + NSIS dual. README에 "NSIS 권장 (빠른 시작), portable은 USB/임시용" 안내.

---

## Task Breakdown

### Task 1: 배포 형식 변경 (P0)

**1a. macOS `dmg` → `zip`:**
```js
mac: {
  target: [{ target: 'zip', arch: ['x64', 'arm64'] }],
  // dmg: 섹션 제거 (또는 미사용으로 두기)
}
```
- 결과 아티팩트: `Markdown Organizer-1.1.6-arm64-mac.zip`, `Markdown Organizer-1.1.6-x64-mac.zip`
- afterPack sign-mac.cjs 동작 영향: zip은 .app을 단순 압축 → 서명 보존됨.
- `dmg-builder` Python 의존성 제거 → `scripts/python` wrapper도 불필요 (단, build:mac script PATH는 유지해 향후 dmg 복구 가능).
- Verify: 로컬 `npm run build:mac` → zip 생성 + `unzip + codesign --verify` 통과 확인.

**1b. Windows portable + NSIS dual:**
```js
win: {
  target: [
    { target: 'portable', arch: ['x64'] },
    { target: 'nsis',     arch: ['x64'] }
  ],
  icon: 'build/icon.ico',
},
nsis: {
  oneClick: false,
  allowToChangeInstallationDirectory: true,
  perMachine: false,        // current user install (admin 권한 불필요)
  deleteAppDataOnUninstall: false,
}
```
- 아티팩트 2개: `Markdown Organizer-Portable-1.1.6.exe`, `Markdown Organizer Setup 1.1.6.exe`.
- release.yml `upload`: pattern을 `dist/*.exe` 로 변경하여 둘 다 업로드.

**1c. README 업데이트:**
- macOS section: 첫 실행 시 "Apple이 확인 불가" 다이얼로그 → 우회법 (xattr or 시스템 설정 → "그래도 열기").
- Windows section: NSIS Setup 권장 (빠른 시작), Portable은 USB / 임시 사용용.

**Files:**
- `electron-builder.cjs`
- `.github/workflows/release.yml` (artifact upload 패턴)
- `README.md`

---

### Task 2: Progressive File Tree Streaming (P0, M9 핵심)

#### 아키텍처

기존:
```
[startup] GET_APP_STATE → buildFileTree(전체 await) → 트리 전체 반환 → UI 렌더
   ↑ 이 await가 UX 정지 원인. M8 Semaphore로 I/O 폭주는 막았으나 await 자체는 남음.
```

신규:
```
[startup] GET_FILE_TREE_STREAM(root)
   → 메인: 즉시 root 정보만 반환 (1 readdir)
   → UI: 루트만 보이는 상태로 즉시 렌더, root 자식 폴더들은 'loading' 상태
   → 메인: 백그라운드 재귀 walk
        - 각 폴더 readdir+stat 완료 시
        - FILE_TREE_NODE { parentPath, children } 이벤트 푸시
   → UI: FILE_TREE_NODE 수신 → 해당 parentPath의 loading 해제 + children 삽입
   → 모든 폴더 완료 → FILE_TREE_COMPLETE 이벤트
   → UI: 전체 트리 완성 상태로 전환
```

#### IPC 채널 (channels.ts 추가)
```ts
GET_FILE_TREE_STREAM: 'get-file-tree-stream',  // invoke: 즉시 root payload 반환
FILE_TREE_NODE:       'file-tree-node',        // event: main → renderer
FILE_TREE_COMPLETE:   'file-tree-complete',    // event: main → renderer
FILE_TREE_ERROR:      'file-tree-error',       // event: main → renderer (선택)
```

#### 메인 구현 (`src/main/ipc/fileTree.ts` 신규)
- 기존 `buildFileTree` 보존 (호환성, 검색 기능에서 사용 가능성).
- 신규 `streamFileTree(rootPath, win)`:
  - root readdir → `{ rootNode: FileNode, isStreaming: true }` 즉시 반환.
  - 백그라운드 워커: `walk(dirPath)` 재귀
    - Semaphore(8) 공유 (M8 그대로)
    - 각 폴더 readdir+stat 후 `webContents.send(FILE_TREE_NODE, { parentPath, children })`
    - children: 폴더는 빈 children, 파일은 modifiedAt 포함
    - 자식 폴더들에 대해 `walk` 재귀 (Promise.all로 동시 진행)
  - 전체 완료 → `FILE_TREE_COMPLETE`

#### 렌더러 구현
**신규 `fileTreeStore.ts` (Zustand):**
```ts
interface FileTreeStore {
  rootPath: string | null
  nodesByPath: Map<string, FileNode>  // 평탄 저장 (트리 조회 빠르게)
  loadingPaths: Set<string>           // readdir 대기 중인 폴더
  status: 'idle' | 'loading' | 'streaming' | 'complete' | 'error'

  startStream(rootPath: string): Promise<void>
  applyNode(parentPath: string, children: FileNode[]): void
  markComplete(): void
}
```

**FileTree 컴포넌트:**
- `nodesByPath`에서 자식 조회.
- 폴더 노드 우측: `loadingPaths.has(folderPath)` ? `<Spinner />` : null
- Spinner: Catppuccin overlay 색 (`text-overlay0`), 12px, smooth rotation.

**Session restore 호환:**
- 현재: 마지막 expanded path들 + scrollPos 저장.
- 신규: streaming 시작 시점에 loading 상태로 expanded 표시 → 데이터 도착 시 자동 expand.
- 마지막 활성 파일은 평소처럼 복원 가능 (파일 메타데이터는 stream으로 도착 후 활성화).

#### Throttle (옵션)
- 매우 큰 프로젝트 (10K+ 폴더)에서 FILE_TREE_NODE 이벤트 폭주 가능 → IPC backpressure.
- 1차 구현은 throttle 없이, 측정 후 필요 시 batching (50ms 윈도우, 한 메시지에 N 이벤트 묶기).

#### 검색 영향
- `searchFiles`는 별도 IPC + 별도 walk (현재 `src/main/ipc/search.ts`). 영향 없음.
- 트리 streaming 중에 검색 가능. 검색은 자체 walk → 결과는 검색 store에 저장.

---

### Task 3: 테스트

- `streamFileTree` unit test: mock BrowserWindow.webContents.send 캡처, walk 순서/이벤트 개수 검증.
- 기존 `buildFileTree` 테스트 유지 (legacy path 사용처용).
- 통합 테스트: 깊은 트리에서 FILE_TREE_NODE 이벤트 총 개수 = 폴더 개수.

---

## Pre-implemented Items

없음.

---

## Test Plan

- `npx vitest run` → 모두 통과 + streamFileTree 새 테스트
- 타입체크 통과
- `electron-vite build` 클린
- macOS: `npm run build:mac` → zip 생성, codesign --verify pass
- Windows (CI): portable + NSIS 두 exe 모두 release artifact에 첨부
- 로컬 dev: 대형 프로젝트 오픈 → UI 즉시 렌더, 폴더별 spinner → 점진적 트리 채워짐

---

## Gotchas

- **electron-builder zip target**: 기본은 `zipBlockmap` 함께 생성됨. blockmap은 electron-updater 차등 업데이트용 → 무시 가능하지만 release artifact에 포함되면 다운로드 페이지가 지저분. `releaseInfo.releaseNotes` 같은 곳에서 제외 처리 검토.
- **NSIS perMachine: false** vs **portable**: 같은 환경에 둘 설치 시 충돌 위험 → README에 "둘 동시 설치 비권장" 명시.
- **FILE_TREE_NODE 이벤트 순서**: webContents.send는 큐 보존이지만 렌더러 처리 비동기 → store는 parentPath 기반 idempotent 조립 필요 (순서 의존 금지).
- **메모리**: 매우 큰 프로젝트(예: monorepo 50K 파일)에서 nodesByPath Map 비대화 가능. 1차 구현은 신경 안 씀; M10에서 측정.
- **Session restore 시점**: 활성 파일 로드는 streaming과 무관하게 즉시 가능 (파일 경로만 필요). 트리 expand 복원은 데이터 도착 후.
- **검색 (M3)**: 기존 검색 IPC는 자체 walk → 영향 없음. 단 트리 store는 검색 결과의 file 메타데이터 조회용으로 쓰일 수 있어 streaming 완료 전 검색 결과 표시는 정상.
