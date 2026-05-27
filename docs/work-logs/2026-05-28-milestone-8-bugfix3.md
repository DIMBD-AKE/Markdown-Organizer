# Milestone 8: 버그픽스 Round 3 + 최적화

**Branch:** `feat/m8-bugfix3`
**Created:** 2026-05-28
**Status:** In Progress

---

## Context (Read This First)

State after M7 completion:

- v1.1.2 배포 완료 (macOS DMG arm64+x64, Windows portable exe, Linux AppImage)
- 47/47 테스트 통과 (detector 26 포함, search.test.ts Electron 환경 문제로 미실행)
- `src/renderer/index.html` CSP: `img-src 'self' data: blob: file:` — `https:` 미포함
- `electron-builder.config.ts`: `mac.identity: null`, afterPack `codesign --force --sign - APP.app` (--deep 없음), portable only
- `src/main/detector/` 전체 async 완료
- `src/renderer/src/components/Viewer/MarkdownRenderer.tsx`:
  - `img` 핸들러(L208): Windows 경로 정규화, `file:///` URL 생성
  - `a` 핸들러(L188): md 링크만 처리, 외부 URL은 `href={href}` 그대로 → Electron에서 앱 내 열림

Goal for M8: 잔여 버그 4가지 완전 해소 + 빌드 용량 최적화 가능 항목 파악 및 적용.

Previous lessons learned relevant to this milestone:
- **CSP 확장**: `img-src`에 `file:` 추가했으나 `https:` 누락 → M7 LESSONS_LEARNED 참고
- **Windows 경로 정규화**: `filePath.replace(/\\/g, '/')` 패턴 이미 적용됨 (`MarkdownRenderer.tsx`)
- **detector async**: 이미 완료 — 재적용 금지, 관련 테스트 모두 async

---

## Task Breakdown

### Task 1: macOS 손상된 파일 지속 해결 (P0)

**Problem:** `codesign --force --sign - APP.app` (top-level, no --deep) 서명 후에도 macOS Gatekeeper "손상된 파일" 오류 지속.

**Root cause 후보:**
1. DMG 생성 시 전자서명이 무효화됨 — electron-builder가 DMG를 생성하면서 .app 내용이 바뀌면 서명 깨짐
2. afterPack은 팩 직후 실행, 이후 electron-builder가 추가 파일 조작 가능
3. `--options runtime` 없이 ad-hoc 서명 시 일부 macOS 버전에서 거부

**Investigation approach:**
- `afterPack` 대신 `afterSign` 훅 사용 시도 — DMG 생성 직전에 서명
- 또는 `afterAllArtifactBuild` 훅에서 마운트된 DMG 내 .app에 직접 서명
- CI 로그에서 실제 서명 시점 확인

**Files to modify:**
- `electron-builder.config.ts` — afterPack → afterSign (또는 afterAllArtifactBuild)

**Implementation notes:**
```ts
// afterSign 시도: DMG 생성 직전에 .app 서명
afterSign: async (context) => {
  if (context.electronPlatformName !== 'darwin') return
  const appPath = context.appOutDir + '/' + context.packager.appInfo.productFilename + '.app'
  spawnSync('codesign', ['--force', '--sign', '-', appPath], { stdio: 'inherit' })
}
```
afterSign은 electron-builder 공식 훅 — afterPack보다 타이밍이 늦음.

### Task 2: 외부 하이퍼링크 → 기본 브라우저 열기 (P0)

**Problem:** 마크다운 문서의 `[text](https://...)` 클릭 시 Electron 앱 내 WebContents에서 열림. 기본 브라우저로 열려야 함.

**Root cause:** `MarkdownRenderer.tsx` a 핸들러에서 `.md` 링크만 인터셉트하고, 나머지는 `href={href}` 그대로 반환. Electron에서 `<a href="https://...">` 클릭 시 `webContents.loadURL`로 처리됨.

`src/main/index.ts`에는 이미 `setWindowOpenHandler`가 있지만, `window.open()`이 아닌 직접 `<a href>` 클릭은 처리하지 않음.

**Files to modify:**
- `src/renderer/src/components/Viewer/MarkdownRenderer.tsx` — a 핸들러 수정

**Implementation notes:**
```tsx
a({ href, children }) {
  const handleClick = (e: React.MouseEvent) => {
    if (!href) return
    if (href.startsWith('http://') || href.startsWith('https://')) {
      e.preventDefault()
      window.api.openPath(href)  // openPath는 이미 shell.openExternal wrapper
      return
    }
    if (href.endsWith('.md')) {
      e.preventDefault()
      // ... 기존 md 파일 내비게이션 로직
    }
  }
  return <a href={href} onClick={handleClick} className="text-blue hover:underline">{children}</a>
}
```

`window.api.openPath`는 이미 `src/main/ipc/projects.ts`에 `OPEN_PATH` 핸들러로 `shell.openExternal` 호출.

### Task 3: 웹 이미지/배지 렌더 불가 (P1)

**Problem:** README의 shields.io 배지, 웹 URL 이미지 렌더 안 됨. `img-src`에 `https:` 없음.

**Files to modify:**
- `src/renderer/index.html` — CSP `img-src` 에 `https:` 추가

**Implementation notes:**
```html
img-src 'self' data: blob: file: https:
```

보안 고려: `https:` 허용은 외부 이미지 로딩을 허용. 마크다운 뷰어 특성상 필요. `http:` 는 의도적으로 제외(HTTPS only).

### Task 4: Windows 프로젝트 오픈 버벅거림 (P1)

**Problem:** async detector 전환 후에도 Windows에서 프로젝트 오픈 시 일시적 버벅거림 지속.

**Root cause 후보:**
- `buildFileTree` (`src/main/fs.ts`) 내에서 파일별 `fs.promises.stat(fp)` 호출 — `.md` 파일 수만큼 별도 I/O. Windows Defender가 각 파일 스캔.
- `Promise.all`로 모든 stat을 동시 실행 → Windows I/O 큐 폭주 가능

**Files to modify:**
- `src/main/fs.ts` — stat 호출 동시성 제한 또는 제거

**Implementation notes — Option A (stat 제거):**
```ts
// stat 호출 없이 modifiedAt: 0 반환
const fileChildren: FileNode[] = files.map((f) => ({
  name: f.name,
  path: path.join(dirPath, f.name),
  isDir: false,
  modifiedAt: 0,
}))
```
단점: StatusDot(신선도 인디케이터) 미작동.

**Implementation notes — Option B (동시성 제한):**
```ts
// p-limit 패턴 인라인 구현
async function pMap<T, R>(items: T[], fn: (item: T) => Promise<R>, limit: number): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return results
}
// 사용: stat 동시성 4로 제한
```

Option B 권장: 신선도 기능 유지. limit=4 정도면 Windows에서 안전.

### Task 5: 빌드 용량 최적화 (P2)

**Problem:** 현재 배포 파일 크기 미측정. 최적화 가능 항목 파악 필요.

**Investigation:**
```bash
# 현재 빌드 파일 크기 측정 (로컬 빌드 필요)
ls -lh dist/*.dmg dist/*.exe dist/*.AppImage 2>/dev/null

# ASAR 내용 확인
npx asar list dist/mac-arm64/Markdown\ Organizer.app/Contents/Resources/app.asar | head -50
```

**Potential targets:**
- `mermaid` (>1MB) — 동적 import 이미 적용됨. 추가 최적화: 필요 시에만 로드 확인
- `@shikijs/rehype` — 모든 언어 번들 로딩 중일 수 있음. 필요 언어만 선택적 로드
- `node_modules` asarUnpack — better-sqlite3, bindings만 언팩. 나머지 모두 ASAR 내 유지 확인
- electron-builder `compression: maximum` 설정 (`nsis.installerCompression` 제거됐으므로 builder 레벨 적용)

**Files to modify (if needed):**
- `electron-builder.config.ts` — compression 설정
- `src/renderer/src/components/Viewer/MermaidDiagram.tsx` — import 최적화 확인

---

## Pre-implemented Items

없음.

---

## Test Plan

- `npx vitest run` → 47/47 유지
- 타입체크 통과
- macOS: DMG 마운트 → 더블클릭 → Gatekeeper 통과 확인 (xattr -cr 없이)
- 외부 URL 클릭 → Safari/Chrome에서 열림 확인
- 웹 이미지/shields.io 배지 → 뷰어에서 렌더 확인
- Windows: 프로젝트 오픈 → 버벅거림 없음 확인

---

## Gotchas

- **afterSign vs afterPack 타이밍**: afterPack은 팩 후, afterSign은 서명 후 (electron-builder 자체 서명 단계 후). `mac.identity: null`이면 afterSign이 호출 안 될 수 있음. 공식 문서 확인 필요.
- **`window.api.openPath` = `shell.openExternal`**: `openPath` IPC는 `src/main/ipc/projects.ts`의 `OPEN_PATH` 핸들러 — `shell.openExternal(targetPath)` 호출. 디렉터리 경로와 URL 모두 처리 가능.
- **CSP `https:`**: 외부 이미지 허용 — SSRF 위험 없음 (마크다운 렌더러는 읽기 전용). 하지만 악성 마크다운 파일의 추적 픽셀 등 허용 가능성 있음. 수용 가능한 트레이드오프.
- **`pMap` concurrency limiter**: 외부 패키지(`p-limit`) 추가 없이 인라인 구현. 순서 유지를 위해 index 기반.
- **LESSONS_LEARNED.md**: 이 마일스톤 시작 전 반드시 읽을 것 — M7에서 추가된 4개 항목 포함.
