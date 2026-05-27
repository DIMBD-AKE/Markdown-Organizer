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

## Verification Findings (2026-05-28, pre-implementation review)

기존 계획 재검토 결과 — Task 1, 2의 접근법 오류 확인. 코드 정독 후 정정.

### Task 1 정정 — `afterSign` 단독으로 불충분

**문제:** `mac.identity: null` 상태에서 `afterSign` 훅 전환만으로는 Gatekeeper 차단 해소 안 됨.

**실제 근본 원인:**
- `codesign --force --sign - APP.app` (현재 코드, `--deep` 없음) → top-level bundle만 서명
- 내부 Mach-O 바이너리 (Electron Helper.app, Squirrel.framework, libffmpeg.dylib 등) 미서명
- macOS Gatekeeper는 quarantine xattr가 붙은 다운로드 앱에 대해 모든 nested 바이너리의 서명 무결성 검증 → 미서명 internal → "손상된 파일" 거부
- `--deep` 플래그는 M7에서 locale.pak `Operation not permitted` 오류로 제거됨 (LESSONS_LEARNED 참고)

**정정된 접근법:** afterPack 훅 유지, 내부 Mach-O 바이너리만 선별 서명 (locale.pak 등 .pak 데이터 파일은 스킵). `--deep` 미사용으로 권한 오류 회피.

```js
afterPack: async (context) => {
  if (context.electronPlatformName !== 'darwin') return
  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
  const frameworks = `${appPath}/Contents/Frameworks`

  // 1. Sign all Helper apps (nested .app bundles)
  const helpers = await findPaths(frameworks, /\.app$/)
  for (const helper of helpers) codesignAdHoc(helper)

  // 2. Sign all .framework bundles
  const fwks = await findPaths(frameworks, /\.framework$/)
  for (const fw of fwks) codesignAdHoc(fw)

  // 3. Sign all .dylib files
  const dylibs = await findFilesByExt(appPath, '.dylib')
  for (const dylib of dylibs) codesignAdHoc(dylib)

  // 4. Sign top-level .app LAST (after all nested signatures established)
  codesignAdHoc(appPath)
}
```

**검증 방법:** 로컬 빌드 후 `codesign --verify --strict --deep --verbose=4 APP.app` — 모든 nested 바이너리 valid 확인.

**한계 인정:** Apple Developer ID + notarization 없이는 macOS 일부 환경(특히 Sequoia 15.x 이후 arm64)에서 여전히 차단 가능. 그 경우 사용자에게 `xattr -cr` 안내 필요. README에 추가.

---

### Task 2 정정 — `OPEN_PATH`는 `shell.openExternal`이 아님

**문제:** 기존 계획서 "openPath = shell.openExternal wrapper" 기재는 코드와 불일치.

**실제 코드 (`src/main/ipc/projects.ts:48-50`):**
```ts
ipcMain.handle(IPC.OPEN_PATH, async (_e, targetPath: string) => {
  await shell.openPath(targetPath)
})
```

- `shell.openPath()` = 파일시스템 경로 전용 (파일/디렉터리 열기)
- `shell.openExternal()` = URL 전용 (https://, mailto:, 등)
- 둘 다 다른 API. `openPath`에 URL 넘기면 Electron 버전에 따라 동작 불확정 (일부는 빈 에러, 일부는 OS에 따라 작동).

**정정된 접근법:** 새 IPC 채널 `OPEN_EXTERNAL` 추가. 명확한 분리.

```ts
// channels.ts
OPEN_EXTERNAL: 'open-external',

// ipc/projects.ts
ipcMain.handle(IPC.OPEN_EXTERNAL, async (_e, url: string) => {
  // Whitelist: http/https only — 보안상 file:, javascript: 등 차단
  if (!/^https?:\/\//.test(url)) return
  await shell.openExternal(url)
})

// preload/index.ts
openExternal: (url: string) => ipcRenderer.invoke(IPC.OPEN_EXTERNAL, url),
```

**보안 고려:** preload/main 양쪽에서 `http(s):` 프로토콜만 허용 화이트리스트. 마크다운 내 악성 `javascript:` URL 차단.

---

### Task 4 보강 — 양축 동시성 제어

`fs.ts:52-65` 코드 재확인:
```ts
const [dirChildren, fileChildren] = await Promise.all([
  Promise.all(dirs.map((d) => buildFileTreeInner(...))),  // 재귀 무제한
  Promise.all(files.map(async (f) => fs.promises.stat(...)))  // stat 무제한
])
```

깊이 5 + 디렉터리당 평균 10폴더 = 최악 10^5 = 100K 동시 호출 가능. Windows Defender 스캔 + I/O 큐 폭주.

**Fix:** pMap 두 곳 모두 적용. limit: 디렉터리 4, 파일 stat 8.

---

### Task 3 — 변경 없음

문서 계획 그대로 진행. `img-src` 에 `https:` 추가.

---

## Task Breakdown

### Task 0: Windows 포터블 exe 빌드 (P0) — 삽질 이력

**Problem:** v1.1.2 이후 Windows 릴리즈에 `markdown-organizer.Setup.*.exe` (NSIS 설치파일) 생성. `portable` 타겟 설정에도 불구.

**Root cause — 분석 과정:**

**시도 1 (v1.1.2): `electron-builder.config.ts` 유지**
- 증상: CI 로그에 `target=nsis`. config 파일에 `portable` 명시에도 무관.
- 가설: sucrase(TypeScript 컴파일러)가 CI에서 실패하여 config 파일 로드 안 됨.
- 증거: 동일 빌드에서 macOS가 `zip`(config에 없는 타겟), Linux가 `snap`(config에 없는 타겟) 생성 → 모두 electron-builder 기본값 → config 파일 로드 실패 확정.
- 결론: 맞음.

**시도 2 (v1.1.3): `electron-builder.config.ts` → `electron-builder.config.cjs`**
- 변경: sucrase 의존성 제거 목적으로 TypeScript → CommonJS 변환.
- 증상: CI 여전히 `target=nsis`. macOS `zip` + DMG, Linux `snap` + AppImage.
- 원인 분석: `read-config-file@6.3.2` 소스 분석 결과, `findAndReadConfig`가 `request.configFilename` prefix로 탐색.
  ```js
  // app-builder-lib/out/util/config.js:35
  const configRequest = { ..., configFilename: "electron-builder", ... }
  
  // read-config-file/out/main.js:42
  for (const configFile of [`${prefix}.yml`, ..., `${prefix}.js`, `${prefix}.cjs`, `${prefix}.ts`])
  ```
  prefix = `"electron-builder"` → 탐색 대상: `electron-builder.{yml,yaml,json,json5,toml,js,cjs,ts}`.
  `electron-builder.config.cjs` (`.config.` 포함) 탐색 대상 아님.
  원래 `electron-builder.config.ts`도 동일 이유로 처음부터 로드 안 된 것.
- 결론: 파일명 prefix 오류.

**시도 3 (v1.1.4 — 정답): `electron-builder.cjs`로 rename**
- 변경: `electron-builder.config.cjs` → `electron-builder.cjs`
- 결과: ✅ portable exe 생성 확인됨 (v1.1.4, 2026-05-28).

**교훈:**
- electron-builder v24 config 파일명: `electron-builder.{yml|yaml|json|json5|toml|js|cjs|ts}` — `.config.` 접두사 없음.
- `electron-builder.config.ts` 형식은 공식 문서 표기와 달리 electron-builder v24.13.3 내부 코드에서 탐색하지 않음.
- config 로드 여부 확인법: CI 로그에서 타겟명 체크 (`target=nsis` → 기본값 → config 로드 실패).

**구조적 한계 — 단일 exe 가능성 및 실행 속도:**
- `portable` 타겟은 electron-builder 공식 지원 타겟. 실행 시 임시 디렉터리에 압축 해제, 실행 후 삭제.
- 완전한 "single file" exe (압축 해제 없이)는 Electron 아키텍처상 불가 — ASAR + native bindings(better-sqlite3)가 filesystem 필요.
- `portable` = 사용자 관점에서 단일 실행 파일 (설치 불필요, 레지스트리 미수정) — 실질적으로 충분.
- NSIS portable과 electron-builder portable의 차이: 전자는 NSIS 래퍼(설치 동작), 후자는 진짜 portable exe.
- **실행 속도 느림 (보고됨, 2026-05-28)**: portable exe 특성상 매 실행마다 `%TEMP%\...` 에 압축 해제 후 실행. 빌드 크기가 클수록 느림. → Task 5 (빌드 용량 최적화)로 완화 가능. 구조적으로 완전 해소 불가.

---

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

**측정 결과 (2026-05-28):**
- `.app` (mac-arm64): 393 MB
- `app.asar`: 167 MB ← v1.1.2 stale (config 미로드로 모든 프로젝트 파일 포함됨)
- `Frameworks/`: 225 MB ← Electron framework + helpers (불가피한 고정 비용)
- DMG: 143 MB compressed
- `out/`: 17 MB (실제 빌드 출력 — 정상 config 로드 시 app.asar 크기)

**개선 적용 (M8):**
- [x] `electron-builder.cjs`에 `compression: 'maximum'` 추가 → LZMA 압축으로 DMG/AppImage/exe 크기 ~5-10% 감소 예상

**향후 최적화 항목 (M8 비범위, 별도 작업):**

1. **Shiki 언어 번들 슬림화 (잠재 ~10MB 감소)**
   - 현재: `shiki` 풀 패키지 → Vite가 모든 270+ 언어를 별도 청크로 빌드 (`out/renderer/assets/` 358 파일)
   - 실제 사용: 12개 언어만 (`shiki.ts`)
   - 마이그레이션 필요: `createHighlighter` → `createHighlighterCore` (`@shikijs/core`)
   ```ts
   import { createHighlighterCore } from 'shiki/core'
   import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
   const highlighter = await createHighlighterCore({
     themes: [import('@shikijs/themes/catppuccin-mocha')],
     langs: [import('@shikijs/langs/typescript'), ...],
     engine: createOnigurumaEngine(import('shiki/wasm'))
   })
   ```
   - 영향도: 비교적 큼 (코드 변경 + 동적 import 패턴 + 테스트). M9 또는 별도 PR 권장.

2. **Mermaid lazy load**: 이미 적용됨 (diagram type별 청크 분리 확인 — wardley, architecture, cytoscape 등 별도 .js).

**Problem (이전):** 현재 배포 파일 크기 미측정. 최적화 가능 항목 파악 필요.

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
