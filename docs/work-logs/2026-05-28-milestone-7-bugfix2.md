# Milestone 7: 버그픽스 Round 2

**Branch:** `main` (hotfix 성격으로 feature branch 없이 직접 작업)
**Completed:** 2026-05-28 02:10
**Status:** Completed

---

## Purpose

v1.1.0 → v1.1.1 → v1.1.2 릴리즈 과정에서 실배포 크로스플랫폼 테스트로 확인된 버그들을 수정. CI/CD 파이프라인 안정화 포함.

---

## What Was Built

- `src/renderer/index.html` — CSP `img-src`에 `file:` 추가 (로컬 이미지 차단 해제)
- `src/renderer/src/components/Viewer/MarkdownRenderer.tsx` — `img`/`a` 핸들러 Windows 경로 정규화 (`replace(/\\/g, '/')`, `file:///` 조합 수정)
- `src/main/detector/dependencyAnalyzer.ts` — 5개 파서 전체 async 전환 (`readFileSync` → `readFile`)
- `src/main/detector/ruleEngine.ts` — `evaluateRules`/`evalCheck` async 전환 (`existsSync` → `access`, `statSync` → `stat`)
- `src/main/detector/index.ts` — `analyzeDirectory` async 전환 (`readdirSync` → `readdir`)
- `src/main/ipc/files.ts` — `GET_APP_STATE` 핸들러에서 `await analyzeDirectory` + `Promise.all`
- `src/main/ipc/projects.ts` — `ADD_PROJECT` 핸들러에서 `await analyzeDirectory`
- `electron-builder.config.ts` — `mac.identity: null`, afterPack `--deep` 제거, NSIS 제거, `portable` 단독, `win.icon: 'build/icon.ico'`
- `package.json` — `release:mac/win/linux` 스크립트 추가 (`--publish never`)
- `.github/workflows/release.yml` — matrix build_cmd를 `release:*`로 교체
- `tests/unit/detector.test.ts` — 26개 테스트 async/await 대응
- `build/icon.ico` — Windows 네이티브 아이콘 파일 추가
- `CHANGELOG.md` — v1.1.2 릴리즈 노트 추가
- v1.1.1 재태그: 깨진 태그 삭제 후 fix commit 이후 재생성

---

## Key Decisions

- **`--publish never` 스크립트 분리**: `build:*` (로컬용)와 `release:*` (CI용) 명확히 구분. 기존 로컬 빌드 스크립트는 변경하지 않음.
- **`mac.identity: null`**: `CSC_IDENTITY_AUTO_DISCOVERY: false` env 방식보다 config 파일로 통제하는 것이 더 안전. 로컬/CI 일관성 보장.
- **afterPack `--deep` 제거**: Electron Framework 내부 파일(`locale.pak` 등)은 이미 Apple이 서명 → `--deep`으로 덮어쓰면 권한 오류. top-level .app 서명만으로 충분.
- **NSIS 제거**: 사용자 요청. 설치파일 불필요, portable만 유지.

---

## Errors and Corrections

- **electron-builder 자동 publish**: GH_TOKEN 제거로 충분하다고 가정했으나 `onTagOrDraft` 기본값 때문에 효과 없음. `--publish never` 명시 필요 — 세션 전반부에 잘못 이해하고 있었음. → LESSONS_LEARNED 추가.
- **detector async 전환 후 테스트 26개 실패**: async 전환 시 테스트도 함께 업데이트해야 함을 놓침. `result = analyzeDirectory()` → `result = await analyzeDirectory()` 26군데 sed로 일괄 수정.
- **`projects.ts`도 누락**: `files.ts`만 await 추가하고 `projects.ts`의 `ADD_PROJECT` 핸들러를 놓침. typecheck에서 발견.
- **v1.1.1 깨진 릴리즈 삭제**: 이전 broken 릴리즈 삭제 권한이 auto-mode에서 차단됨. 사용자 명시 확인 후 진행.
- **macOS 손상 파일 지속**: `mac.identity: null` + `--deep` 제거로 로컬 빌드 오류는 해소됐으나, CI에서 빌드된 DMG가 여전히 일부 환경에서 손상 오류. ad-hoc 서명만으로는 Gatekeeper 완전 통과 불가능 → M8 과제.

---

## Test Results

47/47 통과 (detector 26 포함). `search.test.ts`는 Electron 바이너리 환경 문제로 0 실행 (기존 이슈, 코드 변경과 무관).

---

## Session Continuity Note

- **현재 브랜치**: `main`, v1.1.2 태그 완료, CI 성공
- **잔여 버그 4가지** (M8 과제):
  1. macOS "손상된 파일" — ad-hoc 서명 후에도 Gatekeeper 차단 지속
  2. 외부 하이퍼링크 클릭 → 기본 브라우저 미연동 (shell.openExternal 처리 필요)
  3. 웹 이미지/배지(shields.io 등) — CSP `img-src`에 `https:` 없어서 차단
  4. Windows 프로젝트 오픈 버벅거림 — async 전환 후에도 지속. `buildFileTree`의 파일별 `stat` 호출 N개가 원인 추정
- **빌드 용량 최적화** 요청 있음 — 현재 DMG/exe 크기 미측정
- `src/renderer/index.html` CSP 현재 상태: `img-src 'self' data: blob: file:` — `https:` 미포함 (M8에서 추가 예정)
- `MarkdownRenderer.tsx:208` img 핸들러, `MarkdownRenderer.tsx:188` a 핸들러 — Windows 경로는 수정됐으나 외부 URL 클릭 시 `shell.openExternal` 연동 안 됨 (현재 `href={href}` 그대로 두어 브라우저 컨텍스트 없는 Electron에서 열림)
