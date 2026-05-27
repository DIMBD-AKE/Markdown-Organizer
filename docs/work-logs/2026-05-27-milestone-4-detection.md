# Milestone 4: 프로젝트 탐지 고도화

**Branch:** `feat/m4-detection`
**Created:** 2026-05-27
**Status:** In Progress

---

## Context (Read This First)

State after M3 completion:

- `src/main/analyzer.ts` — 단순 first-match 방식. `RULES[]` 배열을 순서대로 순회하다 첫 매칭에서 즉시 반환. Confidence 없음, 복합 기술 스택 탐지 불가.
- `ProjectType` = `'unity' | 'unreal' | 'node' | 'rust' | 'python' | 'docs' | 'unknown'` (renderer/src/types/index.ts)
- DB 스키마(`src/main/db/schema.ts`): `projects.type TEXT`, `projects.icon TEXT`. **스키마 변경 금지** — 기존 type 값은 하위 호환 유지.
- `TitleBar.tsx`에서 `project.type` + `project.icon` 표시. M4 후 frameworks[] 배지 추가 예정.
- Unity 전용 폴더 제외(`Library`, `Temp`, `Logs`, `obj`, `Build`)는 `src/main/fs.ts`에 있음. 탐지 결과와 연계 가능.
- 검색 기능(M3): IPC `search-files` 핸들러 완성. 41/41 테스트 통과.

Goal for M4: `docs/project-detection-planning.md`의 Phase 1 구현 — Confidence 점수 기반 다중 기술 스택 탐지 시스템.

Previous lessons learned relevant to this milestone:
- **Zustand 개별 selector 필수** — TitleBar.tsx 수정 시 반드시 적용
- **node:sqlite Vite 정적 분석 실패** — DB 관련 코드는 main process 전용. renderer에서 직접 import 금지.

---

## Task Breakdown

### Task 1: 결과 타입 정의

**Goal:** 풍부한 탐지 결과를 담는 TypeScript 인터페이스. DB 스키마는 변경하지 않는다.

**Files to modify:**
- `src/renderer/src/types/index.ts` — 새 인터페이스 추가

**New types:**

```ts
export interface ProjectEvidence {
  rule: string      // 예: "electron dependency"
  path: string      // 예: "package.json"
  score: number     // 부여된 점수
}

export interface ProjectWarning {
  code: string      // 예: "LowConfidence"
  message: string
}

export interface DetectionResult {
  primaryType: ProjectType      // DB 저장용 (기존 호환)
  icon: string                  // DB 저장용 (기존 호환)
  confidence: number            // 0-100
  frameworks: string[]          // 예: ["Electron", "React", "Vite"]
  languages: string[]           // 예: ["TypeScript"]
  buildSystems: string[]        // 예: ["Vite"]
  packageManagers: string[]     // 예: ["pnpm"]
  platforms: string[]           // 예: ["Desktop", "Web"]
  runtimes: string[]            // 예: ["Node.js"]
  evidence: ProjectEvidence[]
  warnings: ProjectWarning[]
}
```

`primaryType`은 기존 `ProjectType` 유니온을 유지하므로 DB 마이그레이션 불필요.

---

### Task 2: DependencyAnalyzer

**Goal:** 매니페스트 파일에서 의존성 목록 추출. 순수 함수, I/O만, 파싱 로직 분리.

**Files to create:**
- `src/main/detector/dependencyAnalyzer.ts`

**Interface:**

```ts
export interface ParsedDependencies {
  all: string[]        // 모든 의존성 이름 (deps + devDeps)
  raw: Record<string, string>  // 원본 버전 포함
}

export function parsePackageJson(rootPath: string): ParsedDependencies | null
// fs.readFileSync → JSON.parse → dependencies + devDependencies 병합
// 실패 시 null (파일 없음, JSON 파싱 오류)

export function parseRequirementsTxt(rootPath: string): string[] | null
// 한 줄씩 읽기, # 주석 제거, 패키지명만 추출 (버전 스펙 제거)
// 예: "flask>=2.0" → "flask"

export function parsePyprojectToml(rootPath: string): string[] | null
// [tool.poetry.dependencies] 또는 [project.dependencies] 섹션 파싱
// 간단 regex 파싱 (toml 라이브러리 추가 없이)

export function parseCargoToml(rootPath: string): string[] | null
// [dependencies] 섹션 파싱, 패키지명 추출

export function parseCsproj(rootPath: string): string[] | null
// glob으로 *.csproj 찾기, PackageReference Include= 추출
```

**Implementation notes:**
- 모든 함수는 throw 금지. try/catch → null 반환.
- `fs.readdirSync` + `path.join`으로 루트에서 파일 탐색.
- *.csproj는 `fs.readdirSync(rootPath).find(f => f.endsWith('.csproj'))`로 찾기.

---

### Task 3: RuleEngine

**Goal:** 증거 기반 점수 계산 엔진. project-detection-planning.md Phase 1 규칙 구현.

**Files to create:**
- `src/main/detector/rules.ts` — 규칙 데이터
- `src/main/detector/ruleEngine.ts` — 점수 계산

**`rules.ts` 구조:**

```ts
export interface DetectionRule {
  id: string           // "unity", "electron", "react" 등
  displayName: string
  category: 'GameEngine' | 'Frontend' | 'Desktop' | 'Backend' | 'Mobile' | 'AI' | 'DevOps'
  primaryType?: ProjectType    // DB primaryType 매핑용
  platform: string[]           // 예: ["Desktop", "Web"]
  language?: string            // 예: "TypeScript"
  runtime?: string             // 예: "Node.js"
  checks: RuleCheck[]
}

export type RuleCheck =
  | { type: 'pathExists'; path: string; score: number }          // 폴더/파일 존재
  | { type: 'fileExists'; path: string; score: number }          // 파일 존재 (정확히)
  | { type: 'globExists'; pattern: string; score: number }       // 확장자 패턴
  | { type: 'hasDependency'; name: string; score: number }       // package.json dep
  | { type: 'hasPythonDep'; name: string; score: number }       // requirements.txt / pyproject.toml
  | { type: 'hasCargoDep'; name: string; score: number }        // Cargo.toml dep
  | { type: 'hasCsprojDep'; name: string; score: number }       // .csproj PackageReference
  | { type: 'packageJsonField'; field: string; score: number }   // package.json 특정 필드 존재
```

**Phase 1 규칙 목록** (project-detection-planning.md §17 기준):

| ID | displayName | checks 요약 |
|---|---|---|
| `unity` | Unity | ProjectSettings/ +40, Assets/ +20, Packages/manifest.json +30, *.asmdef +15 |
| `electron` | Electron | electron dep +50, main field +20, electron-builder dep +10, preload.ts +10 |
| `react` | React | react dep +40, react-dom dep +15, *.tsx +20, src/App.tsx +15, package.json +10 |
| `nextjs` | Next.js | next dep +40, next.config.* +30, app/ +20, pages/ +15 |
| `vue` | Vue | vue dep +40, *.vue +30, vite.config.* +10 |
| `svelte` | Svelte | svelte dep +40, *.svelte +40 |
| `angular` | Angular | angular.json +50, @angular/core dep +30, src/app/ +10 |
| `express` | Express | express dep +60, app.js/server.js +20 |
| `nestjs` | NestJS | @nestjs/core dep +60, app.module.ts +20, main.ts +10 |
| `django` | Django | manage.py +40, django dep +40 |
| `flask` | Flask | flask dep +50, app.py +10 |
| `fastapi` | FastAPI | fastapi dep +60 |
| `docker` | Docker | Dockerfile +40, docker-compose.yml +40, .dockerignore +10 |
| `node` | Node.js | package.json +10 (catch-all) |
| `rust` | Rust | Cargo.toml +40 |
| `python` | Python | requirements.txt +20, pyproject.toml +20 |

**`ruleEngine.ts`:**

```ts
export function evaluateRules(
  rootPath: string,
  rootEntries: string[],       // fs.readdirSync(rootPath)
  deps: ParsedDependencies | null,
  pythonDeps: string[] | null,
  cargoDeps: string[] | null,
): Array<{ rule: DetectionRule; score: number; evidence: ProjectEvidence[] }>
```

각 rule → checks 순회 → score 합산 → evidence 수집. score = 0인 rule 제외.

---

### Task 4: ConfidenceResolver + 메인 분석기

**Goal:** Rule 점수들을 최종 `DetectionResult`로 변환.

**Files to create:**
- `src/main/detector/confidenceResolver.ts`
- `src/main/detector/index.ts` (진입점)

**`confidenceResolver.ts`:**

```ts
export function resolve(
  ruleScores: Array<{ rule: DetectionRule; score: number; evidence: ProjectEvidence[] }>,
  rootPath: string
): DetectionResult

// 1. 최고점 rule → primaryType 결정
// 2. confidence = Math.min(100, topScore) (점수가 100 초과 가능하므로 cap)
// 3. frameworks = score >= 30인 모든 rule의 displayName (중복 제거)
// 4. platforms / languages / runtimes → 해당 rules에서 수집
// 5. packageManagers → 루트에 lock 파일 존재 여부로 판별
//    pnpm-lock.yaml → pnpm, yarn.lock → yarn, bun.lockb → bun, package-lock.json → npm
// 6. buildSystems → vite.config.* → Vite, webpack.config.* → Webpack, turbo.json → Turbopack 등
// 7. warnings 추가: confidence < 50 → LowConfidence
// 8. evidence = 모든 evidence[] 병합

export function getPrimaryType(topRule: DetectionRule | undefined): ProjectType
// topRule 없음 → 'unknown'
// topRule.primaryType 있으면 그것 사용
// category 기반 fallback: GameEngine → 'unity', Frontend → 'node' 등
```

**`detector/index.ts`:**

```ts
export function analyzeDirectory(dirPath: string): DetectionResult
// 1. fs.readdirSync(dirPath) → rootEntries
// 2. DependencyAnalyzer 실행 (package.json, requirements.txt, pyproject.toml, Cargo.toml)
// 3. evaluateRules(...)
// 4. resolve(...)
// 5. fallback: score 전부 0이면 primaryType='unknown', confidence=0
```

기존 `src/main/analyzer.ts`의 `analyzeDirectory` 시그니처와 호환:
- 반환값이 `{ type, icon }` → `DetectionResult`로 변경. 호출처 수정 필요.

---

### Task 5: 호출처 업데이트 + TitleBar UI

**Goal:** 새 탐지 결과를 DB 저장 + UI 표시에 연결.

**Files to modify:**
- `src/main/ipc/projects.ts` (또는 analyzer 호출하는 IPC 핸들러) — `DetectionResult` 사용
- `src/renderer/src/types/index.ts` — `Project` 인터페이스에 `frameworks?: string[]` 추가
- `src/renderer/src/components/TitleBar.tsx` — frameworks 배지 표시

**IPC 핸들러 변경:**

```ts
// 기존
const { type, icon } = analyzeDirectory(path)
// 신규
const result = analyzeDirectory(path)  // DetectionResult
const type = result.primaryType        // DB 저장
const icon = result.icon               // DB 저장
// result.frameworks, result.confidence → 필요시 별도 컬럼 or JSON 저장
```

DB 스키마 변경 없이 `type`, `icon`만 저장. `frameworks`는 런타임에 재탐지로 제공.

**Project 인터페이스 확장:**

```ts
export interface Project {
  // 기존 필드 유지
  id: string; name: string; path: string; type: ProjectType; icon: string
  lastOpened: number | null; createdAt: number
  // 신규
  frameworks?: string[]    // 런타임 탐지 결과 (DB 비저장)
  confidence?: number
}
```

**TitleBar.tsx:**

```tsx
// 기존: type 배지 하나
// 신규: frameworks[] 배지 목록 (최대 3개 표시, 나머지 +N)
// confidence < 50이면 ? 배지 추가
```

---

### Task 6: 패키지 매니저 + 빌드 시스템 탐지

**Files to modify:**
- `src/main/detector/confidenceResolver.ts`

```ts
function detectPackageManagers(rootPath: string, rootEntries: string[]): string[] {
  const result: string[] = []
  if (rootEntries.includes('pnpm-lock.yaml')) result.push('pnpm')
  if (rootEntries.includes('yarn.lock')) result.push('yarn')
  if (rootEntries.some(f => f === 'bun.lockb' || f === 'bun.lock')) result.push('bun')
  if (rootEntries.includes('package-lock.json')) result.push('npm')
  if (rootEntries.includes('Cargo.lock')) result.push('cargo')
  return result
}

function detectBuildSystems(rootPath: string, rootEntries: string[]): string[] {
  const result: string[] = []
  if (rootEntries.some(f => f.startsWith('vite.config'))) result.push('Vite')
  if (rootEntries.some(f => f.startsWith('webpack.config'))) result.push('Webpack')
  if (rootEntries.includes('turbo.json')) result.push('Turbopack')
  if (rootEntries.includes('pom.xml')) result.push('Maven')
  if (rootEntries.some(f => f === 'build.gradle' || f === 'build.gradle.kts')) result.push('Gradle')
  if (rootEntries.some(f => f.endsWith('.sln'))) result.push('MSBuild')
  if (rootEntries.includes('CMakeLists.txt')) result.push('CMake')
  return result
}
```

---

### Task 7: 테스트

**Files to create:**
- `tests/unit/detector.test.ts`

**Test scenarios:**

```ts
// detectUnity: ProjectSettings/ + Assets/ → primaryType='unity', confidence >= 85
// detectElectron: mock package.json with electron dep → frameworks includes 'Electron'
// detectReact+Electron: both → frameworks includes both, primaryType='electron' (higher score)
// detectNode fallback: only package.json → primaryType='node', confidence low
// detectUnknown: empty dir → primaryType='unknown', confidence=0
// detectDocker: Dockerfile present → frameworks includes 'Docker'
// detectFlask: requirements.txt with flask → frameworks includes 'Flask'
// packageManagers: pnpm-lock.yaml → packageManagers=['pnpm']
// buildSystems: vite.config.ts → buildSystems=['Vite']
// warnings: low score → warnings includes LowConfidence
```

**Test approach:** 임시 디렉터리 생성 (tmpDir 패턴 from search.test.ts). 파일 생성 후 `analyzeDirectory(tmpDir)` 호출. I/O 포함 통합 테스트 방식.

---

## Pre-implemented Items

없음. M3에서 탐지 로직 미구현.

---

## Test Plan

1. Unity 프로젝트 구조 → confidence >= 85, primaryType = 'unity'
2. Electron + React 복합 → frameworks = ['Electron', 'React', ...], primaryType = 'electron'
3. Node.js only (package.json) → confidence 낮음 (10점), LowConfidence 경고
4. Flask (requirements.txt with flask) → frameworks = ['Flask'], primaryType = 'python'
5. Docker only → frameworks = ['Docker'], primaryType = 'unknown' 또는 별도 처리
6. 빈 디렉터리 → primaryType = 'unknown', confidence = 0
7. pnpm-lock.yaml → packageManagers = ['pnpm']
8. vite.config.ts 존재 → buildSystems = ['Vite']
9. 기존 `analyzeProjectType` / `analyzeDirectory` 호환 — 기존 호출처 동작 확인

---

## Gotchas

1. **glob 패턴 (`*.tsx`, `*.asmdef`)**: `fs.readdirSync`는 루트 파일만 봄. 중첩 탐색 필요 시 재귀 필요 — 성능 cost. M4는 1단계(루트 파일)와 2단계(하위 폴더 존재 여부)만 구현. Deep scan은 Phase 3.

2. **RegExp lastIndex 오염** (LESSONS_LEARNED.md): globExists 체크에 RegExp 사용 시 파일마다 fresh instance 또는 lastIndex=0 리셋.

3. **DB 저장 필드 변경 금지**: `projects.type`과 `projects.icon`만 저장. `DetectionResult`의 나머지 필드는 앱 실행 시 재탐지. `Project` 인터페이스의 `frameworks` 등은 런타임 only.

4. **기존 analyzer.ts 호출처 파악 필수**: `analyzeDirectory`가 현재 반환하는 `{ type, icon }` 을 사용하는 곳 전부 확인 후 `DetectionResult`로 교체. grep: `analyzeDirectory`.

5. **TitleBar Zustand selector** (LESSONS_LEARNED.md): TitleBar.tsx 수정 시 전체 store 구독 금지. 개별 selector 사용.

6. **점수 합산 cap**: 단일 프레임워크 점수가 100 초과 가능 (Unity: ProjectSettings+40, Assets+20, manifest.json+30, asmdef+15 = 105). `Math.min(100, score)` 적용.

7. **`src/main/detector/` 신규 디렉터리**: `src/main/analyzer.ts` 는 단계적 교체. M4 완료 후 analyzer.ts deprecated 주석 추가 또는 삭제.

8. **DependencyAnalyzer pyproject.toml**: TOML 파서 없이 regex로 파싱. `[project]` 섹션의 `dependencies` 배열 또는 `[tool.poetry.dependencies]` 섹션. 패턴: `/^\s*"?([a-zA-Z0-9_-]+)/` per line.
