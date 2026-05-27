# Milestone 6: 크로스플랫폼 안정화

**Branch:** `feat/m6-stability`
**Created:** 2026-05-27
**Status:** In Progress

---

## Context (Read This First)

State after M5 completion:

- v1.0.0 GitHub Release 배포 완료 (macOS DMG arm64+x64, Windows NSIS, Linux AppImage)
- 67/67 테스트 통과
- `electron-updater` IPC 통합 완료 (7채널, 설정 패널 7-state UI)
- CI/CD: release.yml (v* 태그 → 3플랫폼 병렬 빌드) + ci.yml (push/PR 자동 테스트)
- `src/main/updater.ts`, `src/main/ipc/updater.ts`, `src/preload/index.ts` 업데이트 추가됨
- `electron-builder.config.ts`: 코드사이닝 없는 무서명 빌드

Goal for M6: 실배포 후 발견된 크로스플랫폼 버그 수정 + 포터블 빌드 추가.

Previous lessons learned relevant to this milestone:

- **CSC_LINK 빈값**: CI에서 CSC 환경변수 제거 패턴 이미 적용됨 — 재적용 금지
- **Linux deb**: Snap Store 트리거 방지로 deb 제거 — 유지
- **macOS scripts/python**: DMG 빌더 Python 래퍼 이미 적용됨

---

## Task Breakdown

### Task 1: macOS 코드사이닝 ad-hoc (P0)

**Problem:** arm64 무서명 바이너리 → macOS Gatekeeper 차단 → "손상된 파일" 오류.

**Files to modify:**
- `.github/workflows/release.yml` — macOS 빌드 step에 ad-hoc 사이닝 추가

**Implementation notes:**
```yaml
# macOS build step 후 추가:
- name: Ad-hoc sign
  if: matrix.os == 'macos-latest'
  run: |
    codesign --force --deep --sign - "dist/mac-arm64/Markdown Organizer.app"
    codesign --force --deep --sign - "dist/mac/Markdown Organizer.app"
```
또는 electron-builder의 `afterSign` hook 사용.
ad-hoc 사이닝(`-s -`)은 공증(notarization) 불필요 — 사용자가 `xattr -cr` 없이도 실행 가능.

### Task 2: macOS 트래픽 라이트 (P0)

**Problem:** `frame: false` 커스텀 타이틀바에서 macOS 네이티브 창 컨트롤 없음.

**Files to modify:**
- `src/main/index.ts` — BrowserWindow 옵션 변경
- `src/renderer/src/components/TitleBar.tsx` — 왼쪽 여백 확보

**Implementation notes:**
두 가지 접근:
1. `titleBarStyle: 'hiddenInset'` + `trafficLightPosition: { x: 12, y: 12 }` — 네이티브 버튼 유지, 커스텀 타이틀바 오버레이
2. `frame: false` 유지 + 커스텀 닫기/최소화/최대화 버튼 (3개 원형 버튼) UI 구현

Option 1 권장: 네이티브 동작 그대로, macOS 전용 분기 필요.
`process.platform === 'darwin'`으로 조건 분기.

### Task 3: Windows 렉 프로파일링 + 수정 (P1)

**Problem:** 프로젝트 등록/오픈, 문서 클릭 시 일시적 UI 멈춤.

**Files to investigate:**
- `src/main/ipc/projects.ts` — 프로젝트 등록/오픈 핸들러
- `src/main/ipc/files.ts` — 파일 읽기 핸들러
- `src/main/db/` — SQLite 동기 I/O

**Implementation notes:**
의심 원인:
- `DatabaseSync` (node:sqlite) → 동기 I/O → main 프로세스 블록
- chokidar Windows 폴링: `usePolling: true` 기본값이면 100ms 간격 I/O 폭주

진단 순서:
1. chokidar 설정 확인 → `usePolling` 비활성화 또는 interval 증가
2. IPC 핸들러에서 `await` 누락 체크
3. SQLite 쿼리 무거운 경우 → Worker Thread 이관 고려

### Task 4: Windows 포터블 exe (P1)

**Files to modify:**
- `electron-builder.config.ts` — `win.target`에 portable 추가

**Implementation notes:**
```ts
win: {
  target: [
    { target: 'nsis', arch: ['x64'] },
    { target: 'portable', arch: ['x64'] }
  ]
}
```
portable은 레지스트리/AppData 미사용 → 설치 없이 바로 실행.
release.yml artifacts 패턴에 `*.exe` 포함 확인.

### Task 5: 버전 체크 404 수정 (P2)

**Problem:** 자동업데이트 `latest.yml` 접근 404.

**Files to investigate:**
- `electron-builder.config.ts` — publish.repo, publish.owner 확인
- `src/main/updater.ts` — feedURL 확인

**Implementation notes:**
`https://github.com/DIMBD-AKE/Markdown-Organizer/releases/latest/download/latest.yml` 접근 가능한지 확인.
Release가 public인지 확인 (Draft=false, 비공개 저장소면 토큰 필요).

### Task 6: README 배지 수정 (P3)

**Files to modify:**
- `README.md` — 배지 URL 확인 및 수정

**Implementation notes:**
저장소가 public이면 shields.io/github/actions/workflow/status 배지 동작.
Private이면 배지 표시 안 됨 — 저장소 공개 여부 먼저 확인.

---

## Pre-implemented Items

없음.

---

## Test Plan

- `pnpm test` 67/67 유지
- macOS: DMG 마운트 후 실행 → Gatekeeper 통과 확인
- macOS: 창 열기 → 트래픽 라이트 표시 확인
- Windows: 프로젝트 등록 → 렉 없는지 확인
- Windows portable: 설치 없이 exe 바로 실행
- 자동업데이트: 앱 시작 5초 후 `UPDATE_NOT_AVAILABLE` 또는 `UPDATE_AVAILABLE` 수신

---

## Gotchas

- `titleBarStyle: 'hiddenInset'` 사용 시 TitleBar.tsx 왼쪽에 `pl-20` (약 80px) 여백 필요 — 트래픽 라이트 영역 겹침 방지
- ad-hoc 사이닝은 공증(Apple Developer ID) 불필요지만, Gatekeeper "Unknown Developer" 경고는 여전히 나올 수 있음 — 사용자가 "확인 없이 열기" 선택하거나 `xattr -cr` 안내 필요
- electron-builder portable 타겟은 NSIS 설치본과 별도 아티팩트 생성 — CI release.yml 아티팩트 패턴 갱신 필요
- Windows chokidar: Electron 앱에서 `usePolling` 기본값은 `false`지만 일부 환경(WSL, 네트워크 드라이브)에서 자동 활성화될 수 있음
- 저장소 비공개 상태면 자동업데이트 latest.yml 접근 불가 — 공개 저장소 또는 GitHub token 설정 필요
