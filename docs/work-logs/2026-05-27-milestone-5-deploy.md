# Milestone 5: 배포 준비

**Branch:** `feat/m5-deploy`
**Created:** 2026-05-27
**Status:** In Progress

---

## Context (Read This First)

M4 완료 후 상태:

- 앱 실행/빌드 정상 (electron-vite + electron-builder)
- `electron-builder.config.ts` 존재 — 기본 구조만. mac/win/linux target 있으나 아이콘 없음, 코드사이닝 없음, auto-updater 없음.
- `build/` 디렉토리 **완전 비어있음** — 아이콘 파일 없음. electron-builder가 icon 못 찾으면 빌드 에러.
- `package.json`: scripts에 `build:win`, `build:mac`, `build:linux` 있음. version `1.0.0`.
- 탐지 엔진: 72룰, 67/67 테스트 통과.
- 기존 `src/main/analyzer.ts` 레거시 유지 (구버전 테스트 참조).

Goal for M5: 3개 플랫폼(Windows/macOS/Linux) 배포 가능한 상태 — 아이콘, 빌더 설정 완성, 자동 업데이트, GitHub Actions CI/CD.

Previous lessons learned relevant to this milestone:
- `asarUnpack`에 `better-sqlite3`와 `bindings` 반드시 포함 (이미 설정됨).
- node:sqlite는 main process 전용 — renderer import 금지.

---

## Task Breakdown

### Task 1: 앱 아이콘 제작

**Goal:** 3개 플랫폼 아이콘 파일 생성 → `build/` 배치.

**Files to create:**
- `build/icon.png` — 1024×1024 PNG (Linux 기준, electron-builder가 다른 크기 자동 생성)
- `build/icon.icns` — macOS용 (512×512 이상 PNG로부터 `iconutil` 또는 `png2icns`로 생성)
- `build/icon.ico` — Windows용 (256×256 포함 멀티 사이즈 ICO)

**Implementation notes:**
- 방법 1: 1024×1024 PNG 하나만 만들고 electron-builder의 자동 변환 사용. `mac.icon`, `win.icon` 필드 지정 없으면 `build/icon.png`를 fallback으로 자동 탐색.
- 방법 2: `electron-icon-maker` 또는 `icns-gen` 패키지로 PNG→icns/ico 변환.
- 아이콘 디자인: 앱 성격(Markdown/문서 관리)에 맞는 단순한 아이콘. 검은 배경 + Catppuccin 팔레트 권장.

**Quick approach (외부 도구 없이):**
```bash
# 온라인 변환 또는 macOS 내장 sips 사용
sips -z 1024 1024 source.png --out build/icon.png
# icns는 iconutil 필요 (macOS only)
# ico는 ImageMagick 또는 온라인 변환
```

---

### Task 2: electron-builder.config.ts 완성

**Files to modify:**
- `electron-builder.config.ts`

**Current state:**
```ts
export default defineConfig({
  appId: 'com.markdown-organizer.app',
  productName: 'Markdown Organizer',
  directories: { buildResources: 'build' },
  files: ['out/**'],
  asarUnpack: ['**/node_modules/better-sqlite3/**/*', '**/node_modules/bindings/**/*'],
  mac: { target: [{ target: 'dmg', arch: ['x64', 'arm64'] }] },
  win: { target: [{ target: 'nsis', arch: ['x64'] }] },
  linux: { target: ['AppImage', 'deb'] }
})
```

**Target state:**
```ts
export default defineConfig({
  appId: 'com.markdown-organizer.app',
  productName: 'Markdown Organizer',
  copyright: `Copyright © ${new Date().getFullYear()} 이드림`,
  directories: { buildResources: 'build', output: 'dist' },
  files: ['out/**'],
  asarUnpack: ['**/node_modules/better-sqlite3/**/*', '**/node_modules/bindings/**/*'],

  publish: {
    provider: 'github',
    owner: '<github-username>',
    repo: 'markdown-organizer',
  },

  mac: {
    target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
    icon: 'build/icon.icns',
    category: 'public.app-category.productivity',
    darkModeSupport: true,
    // 코드사이닝: 환경변수로 주입 (CSC_LINK, CSC_KEY_PASSWORD)
    // Notarization: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID
  },
  dmg: {
    title: 'Markdown Organizer',
    contents: [
      { x: 130, y: 220, type: 'file' },
      { x: 410, y: 220, type: 'link', path: '/Applications' },
    ],
  },

  win: {
    target: [{ target: 'nsis', arch: ['x64', 'arm64'] }],
    icon: 'build/icon.ico',
    // 코드사이닝: CSC_LINK, CSC_KEY_PASSWORD (EV cert)
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },

  linux: {
    target: ['AppImage', 'deb'],
    icon: 'build/icon.png',
    category: 'Office',
    description: 'Desktop app for managing AI-generated Markdown documents',
    executableName: 'markdown-organizer',
  },
  deb: {
    depends: ['libgtk-3-0', 'libnotify4', 'libnss3', 'libxss1', 'libxtst6', 'xdg-utils', 'libatspi2.0-0', 'libdrm2', 'libgbm1'],
  },
})
```

---

### Task 3: package.json 메타데이터 보완

**Files to modify:**
- `package.json`

추가할 필드:
```json
{
  "author": {
    "name": "이드림",
    "email": "dream70521@gmail.com"
  },
  "homepage": "https://github.com/<username>/markdown-organizer",
  "repository": {
    "type": "git",
    "url": "https://github.com/<username>/markdown-organizer"
  },
  "license": "MIT"
}
```

---

### Task 4: 자동 업데이트 (electron-updater)

**Goal:** GitHub Releases 기반 자동 업데이트. 설정 패널에서 수동 확인 버튼.

**Files to create:**
- `src/main/updater.ts` — updatee 체크 + IPC 이벤트

**Files to modify:**
- `src/main/index.ts` — updater 초기화
- `src/renderer/src/components/Settings/SettingsPanel.tsx` — 업데이트 확인 UI
- `src/renderer/src/preload/index.ts` — IPC 채널 노출
- `src/main/ipc/channels.ts` — 새 채널

**Implementation notes:**

```ts
// src/main/updater.ts
import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

export function setupAutoUpdater(win: BrowserWindow) {
  autoUpdater.autoDownload = false  // 사용자 확인 후 다운로드

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update-available', info)
  })
  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update-not-available')
  })
  autoUpdater.on('download-progress', (p) => {
    win.webContents.send('update-progress', p)
  })
  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update-downloaded')
  })

  // 스타트업 시 5초 후 조용히 확인
  setTimeout(() => autoUpdater.checkForUpdates(), 5000)
}

// IPC: 'check-for-updates' → autoUpdater.checkForUpdates()
// IPC: 'install-update' → autoUpdater.quitAndInstall()
```

**Package:**
```bash
pnpm add electron-updater
```

**Gotcha:** `electron-updater`는 `publish` 설정이 `electron-builder.config.ts`에 있어야 작동. 개발 중 `process.env.NODE_ENV === 'development'`일 때 업데이트 체크 스킵 필수.

---

### Task 5: GitHub Actions — 크로스 플랫폼 빌드 CI

**Goal:** tag push (v*) 시 3개 플랫폼 병렬 빌드 → GitHub Release 자동 생성 + 아티팩트 업로드.

**Files to create:**
- `.github/workflows/release.yml`

**Template:**
```yaml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  release:
    strategy:
      matrix:
        include:
          - os: macos-latest
            build_cmd: build:mac
          - os: windows-latest
            build_cmd: build:win
          - os: ubuntu-latest
            build_cmd: build:linux

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build and publish
        run: pnpm ${{ matrix.build_cmd }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # macOS signing (선택)
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          # macOS notarization (선택)
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

**Implementation notes:**
- `electron-builder --publish always` 플래그로 GitHub Release에 자동 업로드
- `GH_TOKEN`은 GitHub Actions에서 자동 주입 (repo permission 필요)
- Windows 빌드는 Linux/macOS 러너에서 cross-compile 불가 → matrix 전략 필수
- macOS universal binary (`x64 + arm64`) 빌드는 macOS 러너에서만 가능

---

### Task 6: 빌드 검증

각 플랫폼 빌드 후 확인 항목:
- `dist/` 내 패키지 파일 생성 확인
- 설치 후 앱 실행 확인
- DB 파일 생성 위치 확인 (`app.getPath('userData')`)
- 아이콘 표시 확인
- auto-updater가 개발 환경에서 스킵되는지 확인

---

## Pre-implemented Items

없음.

---

## Test Plan

1. macOS: `pnpm build:mac` → `dist/*.dmg` 생성, 설치, 실행
2. Windows: `pnpm build:win` (또는 CI) → `dist/*.exe` 생성, 설치, 실행
3. Linux: `pnpm build:linux` → `dist/*.AppImage` 실행 (또는 CI)
4. auto-updater: GitHub Release에 새 버전 태그 → 기존 설치 앱에서 업데이트 감지 확인

---

## Gotchas

1. **아이콘 없으면 electron-builder 에러**: `build/icon.png` (또는 icns/ico) 없으면 빌드 실패. Task 1이 블로커.

2. **macOS 코드사이닝 없이 배포**: 사용자 컴퓨터에서 "개발자를 확인할 수 없습니다" 경고. 개인 배포라면 무시 가능, 스토어 배포면 필수.

3. **electron-updater dev 환경 에러**: 개발 환경에서 `autoUpdater.checkForUpdates()` 호출 시 에러. 반드시 `if (process.env.NODE_ENV === 'production')` 가드 필요.

4. **Windows cross-compile 불가**: macOS/Linux에서 `build:win` 실행 불가 (native 모듈 `better-sqlite3` 때문). CI에서 Windows 러너 필수.

5. **GitHub token publish permission**: GitHub Actions에서 Release 생성하려면 repo의 `Settings > Actions > Workflow permissions`에서 Read and write 권한 허용.

6. **better-sqlite3 asarUnpack**: 이미 설정됨. 변경하면 앱 실행 시 native module 로드 실패.

7. **userData 경로**: Electron이 OS별 표준 경로 사용 (`~/Library/Application Support/`, `%APPDATA%`, `~/.config/`). DB 파일 자동 저장되므로 별도 처리 불필요.
