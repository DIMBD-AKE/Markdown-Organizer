# Milestone 4: 프로젝트 탐지 고도화

**Branch:** `feat/m4-detection`
**Completed:** 2026-05-27 15:00
**Status:** Completed

---

## Purpose

`analyzer.ts`의 단순 first-match 방식을 Confidence 점수 기반 다중 기술 스택 탐지 시스템으로 교체.

---

## What Was Built

**탐지 엔진 (`src/main/detector/`)**
- `dependencyAnalyzer.ts` — package.json, requirements.txt, pyproject.toml, Cargo.toml, .csproj 파싱
- `rules.ts` — 72개 탐지 룰 (GameEngine×5, Desktop×4, Frontend×12, Backend×14, Mobile×4, AI×5, DevOps×4, Monorepo×3, Docs×5, Language×16)
- `ruleEngine.ts` — check 타입별 점수 계산 (pathExists, fileExists, globExists, hasDependency, hasPythonDep, hasCargoDep, hasCsprojDep, packageJsonField)
- `confidenceResolver.ts` — 점수 → DetectionResult 변환, 패키지 매니저 + 빌드 시스템 탐지
- `index.ts` — 진입점, src/lib/app/cmd/internal 5개 하위 디렉토리 shallow scan

**타입 시스템 확장 (`src/renderer/src/types/index.ts`)**
- `ProjectEvidence`, `ProjectWarning`, `DetectionResult` 인터페이스 추가
- `Project`에 `frameworks?`, `confidence?` 필드 추가 (DB 비저장, 런타임 전용)
- `ProjectType` 유니온 확장: `go | java | php | ruby | dart | cpp | csharp`

**IPC 업데이트**
- `projects.ts`: ADD_PROJECT → DetectionResult 사용, frameworks/confidence 반환
- `files.ts`: GET_APP_STATE → 기존 프로젝트 스타트업 시 재분석

**UI**
- `TitleBar.tsx`: 단일 타입 배지 → frameworks 배지 목록 (최대 3개, 나머지 +N), confidence < 50 → `?` 배지
- TYPE_LABEL에 새 타입(go, java, php, ruby, dart, cpp, csharp) 추가

**테스트**
- `tests/unit/detector.test.ts` 신규: 26개 테스트 (Unity, Electron, React, Electron+React 복합, Node fallback, Flask, Django, Docker, Unknown, pnpm/npm, Vite/Webpack, LowConfidence, Rust, Tauri, Godot, Go, Kubernetes, Terraform, GitHub Actions, Obsidian, Laravel, Jupyter, SvelteKit)

---

## Key Decisions

- **DB 스키마 변경 없음**: frameworks/confidence는 런타임 재분석으로 제공. type/icon만 DB 저장.
- **하위 디렉토리 스캔**: src/ 단독 → src/lib/app/cmd/internal 5개 → *.tsx, *.go 등 glob 탐지 정확도 향상.
- **frameworks 표시 기준**: score >= 30 인 rule만 포함 (catch-all 10점짜리 Node.js 등 제외).
- **순환 점수 cap**: `Math.min(100, topScore)` — Unity같이 100점 초과 가능한 룰 처리.

---

## Errors and Corrections

- **Electron+React 순서 가정 오류**: 테스트에서 Electron이 React보다 높은 점수일 것으로 예상했으나, React 룰에 `*.tsx` glob(+20) + `src/App.tsx` fileExists(+15) + `package.json`(+10) = React 100점 > Electron 90점. `indexOf` 순서 assertion 제거.
  - 해결: 단순히 두 프레임워크가 모두 포함되는지만 검증.

---

## Test Results

67/67 통과. TypeScript clean. 빌드 clean.

---

## Session Continuity Note

M4 완전 구현. 탐지 엔진은 `src/main/detector/`에 독립 모듈로 존재. 기존 `src/main/analyzer.ts`는 구버전이나 하위 호환 테스트(`analyzer.test.ts`)가 여전히 참조하므로 삭제하지 않음. M5는 배포 준비 — 아이콘, 코드사이닝, 자동 업데이트, CI/CD. 현재 `build/` 디렉토리 비어있고 `electron-builder.config.ts`에 기본 구조만 존재.
