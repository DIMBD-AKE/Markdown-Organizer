# 프로젝트 자동 탐지 시스템 기획 및 구현 문서

> 범용 프로젝트 폴더 분석 및 기술 스택 자동 탐지 시스템 설계 문서  
> Confidence 기반 Rule Engine 아키텍처 중심

---

## 1. 목표

사용자가 특정 폴더를 입력하면 다음 정보를 자동으로 분석한다.

- 프로젝트 종류 판별
- 사용 언어 분석
- 프레임워크 탐지
- 빌드 시스템 분석
- 패키지 매니저 탐지
- 런타임 분석
- 플랫폼 판별
- 모노레포 구조 탐지
- Confidence 기반 결과 제공

---

## 2. 시스템 목표 범위

| 범위 | 지원 예시 |
|---|---|
| 게임 엔진 | Unity, Unreal, Godot, GameMaker, RPG Maker |
| 웹 프론트 | React, Vue, Angular, Svelte, Astro, Next.js, Nuxt |
| 웹 백엔드 | ASP.NET Core, Blazor, Express, NestJS, Spring Boot, Django, Flask, FastAPI |
| 데스크탑 앱 | Electron, Tauri, WPF, WinForms, Avalonia |
| 모바일 | Flutter, React Native, Android Native, iOS Native |
| 서버 | Node.js, Go, Rust, Python, Java, C# |
| AI / 데이터 | Jupyter, PyTorch, TensorFlow, MLFlow |
| DevOps | Docker, Docker Compose, Kubernetes |
| 모노레포 | Nx, Turborepo, pnpm workspace |
| 패키지 관리 | npm, yarn, pnpm, bun, nuget, cargo |

---

## 3. 핵심 설계 철학

### 3.1 단일 타입 판별 금지

잘못된 방식:

```txt
이 프로젝트는 React 입니다
```

현실적인 방식:

```txt
Primary: Electron

Frameworks:
- React
- Vite
- TypeScript

Confidence: 94%
```

실제 프로젝트는 대부분 복합 구조이다.

예시:

- Electron + React + Vite
- ASP.NET Core + Blazor
- Unity + DOTS + URP
- Next.js + Tailwind + Prisma
- Monorepo + React + ASP.NET Core + Docker

따라서 이 시스템의 목표는 하나의 정답을 맞히는 것이 아니라, 가능성이 높은 기술 스택을 신뢰도와 함께 구조적으로 제공하는 것이다.

---

## 4. 시스템 전체 구조

### 4.1 최상위 결과 구조

```csharp
public sealed class ProjectScanResult
{
    public string RootType { get; init; }
    public float Confidence { get; init; }

    public List<string> Languages { get; init; } = new();
    public List<string> Frameworks { get; init; } = new();
    public List<string> BuildSystems { get; init; } = new();
    public List<string> Platforms { get; init; } = new();
    public List<string> PackageManagers { get; init; } = new();
    public List<string> Runtimes { get; init; } = new();

    public List<ProjectEvidence> Evidence { get; init; } = new();
    public List<ProjectWarning> Warnings { get; init; } = new();

    public List<ProjectScanResult> Children { get; init; } = new();
}
```

### 4.2 Evidence 구조

```csharp
public sealed class ProjectEvidence
{
    public string Rule { get; init; }
    public string Path { get; init; }
    public float Score { get; init; }
}
```

### 4.3 Warning 구조

```csharp
public sealed class ProjectWarning
{
    public string Code { get; init; }
    public string Message { get; init; }
}
```

---

## 5. Confidence 시스템

### 5.1 기본 개념

탐지는 증거 기반 점수 시스템으로 동작한다.

예시:

```txt
React
--------------------------------
package.json             +10
react dependency         +40
jsx/tsx source           +20
vite.config.ts           +15
react-dom                +10
--------------------------------
TOTAL                    95
```

### 5.2 Confidence 레벨 기준

| 점수 | 의미 |
|---:|---|
| 90 ~ 100 | 거의 확실 |
| 70 ~ 89 | 높은 가능성 |
| 50 ~ 69 | 가능성 있음 |
| 30 ~ 49 | 약한 추정 |
| 0 ~ 29 | 참고 수준 |

### 5.3 점수 계산 원칙

- 강한 증거는 높은 점수 부여
- 단일 파일만으로 확정하지 않음
- 의존성, 폴더 구조, 설정 파일, 소스 파일을 함께 평가
- 복수 기술 스택이 동시에 높은 점수를 받을 수 있음
- 모호한 경우 Warning을 함께 반환

---

## 6. 프로젝트 탐지 규칙 목록

---

# 6.1 게임 엔진

## Unity

| 조건 | 점수 |
|---|---:|
| `ProjectSettings/` | +40 |
| `Assets/` | +20 |
| `Packages/manifest.json` | +30 |
| `*.asmdef` | +15 |
| `Library/` | +10 |

예상 결과:

```json
{
  "type": "Unity",
  "confidence": 98
}
```

## Unreal Engine

| 조건 | 점수 |
|---|---:|
| `*.uproject` | +60 |
| `Source/` | +15 |
| `Content/` | +15 |
| `Config/` | +10 |

## Godot

| 조건 | 점수 |
|---|---:|
| `project.godot` | +80 |
| `*.tscn` | +20 |

## GameMaker

| 조건 | 점수 |
|---|---:|
| `*.yyp` | +70 |
| `rooms/` | +10 |
| `sprites/` | +10 |

## RPG Maker

| 조건 | 점수 |
|---|---:|
| `Game.rpgproject` | +80 |
| `data/` | +10 |

---

# 6.2 웹 프론트엔드

## React

| 조건 | 점수 |
|---|---:|
| `package.json` | +10 |
| `react` dependency | +40 |
| `react-dom` dependency | +15 |
| `*.jsx` / `*.tsx` | +20 |
| `src/App.tsx` | +15 |

## Next.js

| 조건 | 점수 |
|---|---:|
| `next` dependency | +40 |
| `next.config.*` | +30 |
| `app/` directory | +20 |
| `pages/` directory | +15 |

## Vue

| 조건 | 점수 |
|---|---:|
| `vue` dependency | +40 |
| `*.vue` | +30 |
| `vite.config.*` | +10 |

## Nuxt

| 조건 | 점수 |
|---|---:|
| `nuxt` dependency | +50 |
| `nuxt.config.*` | +30 |

## Angular

| 조건 | 점수 |
|---|---:|
| `angular.json` | +50 |
| `@angular/core` dependency | +30 |
| `src/app/` | +10 |

## Svelte

| 조건 | 점수 |
|---|---:|
| `svelte` dependency | +40 |
| `*.svelte` | +40 |

## Astro

| 조건 | 점수 |
|---|---:|
| `astro` dependency | +50 |
| `astro.config.*` | +30 |

---

# 6.3 데스크탑 앱

## Electron

| 조건 | 점수 |
|---|---:|
| `electron` dependency | +50 |
| `main` field in `package.json` | +20 |
| `electron-builder` dependency | +10 |
| `preload.js` / `preload.ts` | +10 |

## Tauri

| 조건 | 점수 |
|---|---:|
| `src-tauri/` | +50 |
| `tauri.conf.json` | +40 |

## WPF

| 조건 | 점수 |
|---|---:|
| `UseWPF=true` | +60 |
| `App.xaml` | +20 |

## WinForms

| 조건 | 점수 |
|---|---:|
| `System.Windows.Forms` | +50 |
| `*.Designer.cs` | +20 |

## Avalonia

| 조건 | 점수 |
|---|---:|
| `Avalonia` dependency | +60 |
| `App.axaml` | +20 |

---

# 6.4 백엔드 서버

## ASP.NET Core

| 조건 | 점수 |
|---|---:|
| `Microsoft.AspNetCore` dependency | +50 |
| `Program.cs` | +15 |
| `appsettings.json` | +15 |

## Blazor

| 조건 | 점수 |
|---|---:|
| `Microsoft.AspNetCore.Components` dependency | +50 |
| `*.razor` | +30 |
| `_Imports.razor` | +20 |

## Express

| 조건 | 점수 |
|---|---:|
| `express` dependency | +60 |
| `app.js` / `server.js` | +20 |

## NestJS

| 조건 | 점수 |
|---|---:|
| `@nestjs/core` dependency | +60 |
| `main.ts` | +10 |
| `app.module.ts` | +20 |

## Fastify

| 조건 | 점수 |
|---|---:|
| `fastify` dependency | +60 |

## Spring Boot

| 조건 | 점수 |
|---|---:|
| `spring-boot-starter` dependency | +60 |
| `pom.xml` / `build.gradle` | +20 |

## Django

| 조건 | 점수 |
|---|---:|
| `manage.py` | +40 |
| `django` dependency | +40 |

## Flask

| 조건 | 점수 |
|---|---:|
| `flask` dependency | +50 |
| `app.py` | +10 |

## FastAPI

| 조건 | 점수 |
|---|---:|
| `fastapi` dependency | +60 |

---

# 6.5 모바일

## Flutter

| 조건 | 점수 |
|---|---:|
| `pubspec.yaml` | +30 |
| Flutter SDK 설정 | +50 |
| `lib/main.dart` | +10 |

## React Native

| 조건 | 점수 |
|---|---:|
| `react-native` dependency | +60 |
| `android/` and `ios/` | +20 |

## Android Native

| 조건 | 점수 |
|---|---:|
| `build.gradle` | +20 |
| `AndroidManifest.xml` | +50 |

## iOS Native

| 조건 | 점수 |
|---|---:|
| `*.xcodeproj` | +60 |
| `Info.plist` | +20 |

---

# 6.6 AI / 데이터 프로젝트

## Jupyter

| 조건 | 점수 |
|---|---:|
| `*.ipynb` | +80 |

## PyTorch

| 조건 | 점수 |
|---|---:|
| `torch` dependency | +50 |

## TensorFlow

| 조건 | 점수 |
|---|---:|
| `tensorflow` dependency | +50 |

## MLFlow

| 조건 | 점수 |
|---|---:|
| `mlflow` dependency | +50 |

---

## 7. 빌드 시스템 탐지

| 시스템 | 조건 |
|---|---|
| Vite | `vite.config.*` |
| Webpack | `webpack.config.*` |
| Turbopack | `turbo.json` |
| Gradle | `build.gradle` |
| Maven | `pom.xml` |
| Cargo | `Cargo.toml` |
| MSBuild | `*.sln`, `*.csproj` |
| CMake | `CMakeLists.txt` |

---

## 8. 패키지 매니저 탐지

| 매니저 | 조건 |
|---|---|
| npm | `package-lock.json` |
| yarn | `yarn.lock` |
| pnpm | `pnpm-lock.yaml` |
| bun | `bun.lockb`, `bun.lock` |
| NuGet | `packages.config`, `*.csproj` PackageReference |
| cargo | `Cargo.lock` |

---

## 9. 모노레포 탐지

## Nx

| 조건 | 점수 |
|---|---:|
| `nx.json` | +70 |

## Turborepo

| 조건 | 점수 |
|---|---:|
| `turbo.json` | +70 |

## pnpm workspace

| 조건 | 점수 |
|---|---:|
| `pnpm-workspace.yaml` | +60 |

## Yarn workspace

| 조건 | 점수 |
|---|---:|
| `workspaces` field in `package.json` | +50 |

---

## 10. Docker / DevOps 탐지

## Docker

| 조건 | 점수 |
|---|---:|
| `Dockerfile` | +40 |
| `docker-compose.yml` | +40 |
| `.dockerignore` | +10 |

## Kubernetes

| 조건 | 점수 |
|---|---:|
| `k8s/` | +20 |
| `deployment.yaml` | +40 |
| `service.yaml` | +20 |
| `ingress.yaml` | +20 |

---

## 11. 플랫폼 판별

| 플랫폼 | 조건 예시 |
|---|---|
| Web | HTML, JavaScript, TypeScript, React, Vue, Angular |
| Desktop | Electron, Tauri, WPF, WinForms, Avalonia |
| Mobile | Flutter, React Native, Android, iOS |
| Game | Unity, Unreal, Godot |
| Server | ASP.NET Core, Node.js, Spring, Django, FastAPI |
| Data / AI | Jupyter, PyTorch, TensorFlow |
| DevOps | Docker, Kubernetes |

---

## 12. 모노레포 처리 전략

### 12.1 예시 구조

```txt
repo/
 ├ frontend/
 ├ backend/
 ├ launcher/
 └ game/
```

### 12.2 처리 결과

```json
{
  "type": "Monorepo",
  "children": [
    {
      "path": "frontend",
      "frameworks": ["React"]
    },
    {
      "path": "backend",
      "frameworks": ["ASP.NET Core"]
    },
    {
      "path": "launcher",
      "frameworks": ["Electron"]
    },
    {
      "path": "game",
      "frameworks": ["Unity"]
    }
  ]
}
```

---

## 13. 스캔 전략

## 13.1 1단계 — Root Scan

빠른 루트 파일 검사.

대표 파일:

- `package.json`
- `*.csproj`
- `*.sln`
- `Cargo.toml`
- `go.mod`
- `pubspec.yaml`
- `pom.xml`
- `build.gradle`

## 13.2 2단계 — Structure Scan

폴더 구조 분석.

대표 폴더:

- `Assets/`
- `ProjectSettings/`
- `Pages/`
- `Components/`
- `src-tauri/`
- `android/`
- `ios/`
- `k8s/`

## 13.3 3단계 — Dependency Scan

매니페스트 내부 의존성 분석.

대상 예시:

- `package.json` dependencies
- `.csproj` PackageReference
- `pom.xml` dependencies
- `build.gradle` dependencies
- `requirements.txt`
- `pyproject.toml`

## 13.4 4단계 — Deep Scan

선택적 심층 분석.

- import 분석
- source parsing
- AST parsing
- namespace 분석
- entrypoint 분석

---

## 14. 성능 전략

### 14.1 캐싱

기본 전략:

```txt
LastWriteTime 기반 캐시
```

권장 캐시 키:

```txt
RootPath + LastWriteTime + FileCount + ManifestHash
```

### 14.2 Ignore 처리

기본 제외 대상:

```txt
node_modules
Library
Temp
dist
build
bin
obj
DerivedData
.vs
.git
.idea
.vscode
coverage
```

---

## 15. 경고 시스템

### 15.1 경고 예시

```json
{
  "warning": "Only build output detected"
}
```

### 15.2 가능한 경고 목록

| 경고 코드 | 의미 |
|---|---|
| `BuildOutputOnly` | 소스 없이 빌드 결과물만 존재 |
| `EmptyProject` | 빈 프로젝트 또는 템플릿 상태 |
| `PartialRepository` | 일부 파일만 존재 |
| `UnknownFramework` | 알 수 없는 프레임워크 |
| `MixedFrameworks` | 복합 프레임워크 구조 |
| `MonorepoDetected` | 하위 프로젝트 여러 개 발견 |
| `LowConfidence` | 판별 신뢰도가 낮음 |

---

## 16. 최종 출력 예시

```json
{
  "rootType": "DesktopApp",
  "confidence": 94,
  "languages": [
    "TypeScript"
  ],
  "frameworks": [
    "Electron",
    "React",
    "Vite"
  ],
  "packageManagers": [
    "pnpm"
  ],
  "buildSystems": [
    "Vite"
  ],
  "platforms": [
    "Desktop",
    "Web"
  ],
  "runtimes": [
    "Node.js"
  ],
  "children": [],
  "evidence": [
    {
      "rule": "electron dependency",
      "path": "package.json",
      "score": 50
    },
    {
      "rule": "vite config",
      "path": "vite.config.ts",
      "score": 15
    },
    {
      "rule": "react dependency",
      "path": "package.json",
      "score": 40
    }
  ],
  "warnings": []
}
```

---

## 17. 추천 구현 우선순위

## Phase 1

필수 지원 대상.

- Unity
- React
- Electron
- ASP.NET Core
- Blazor
- Node.js
- Express
- Docker

## Phase 2

확장 지원 대상.

- Unreal Engine
- Flutter
- React Native
- Vue
- Next.js
- NestJS
- Spring Boot
- Tauri

## Phase 3

고급 지원 대상.

- AI / ML 프로젝트
- Monorepo 분석
- Kubernetes
- Deep Scan
- AST 기반 분석
- 커스텀 룰 플러그인

---

## 18. 추천 아키텍처

```txt
ProjectScanner
 ├ RuleEngine
 ├ FileScanner
 ├ DependencyAnalyzer
 ├ StructureAnalyzer
 ├ MonorepoAnalyzer
 ├ ConfidenceResolver
 ├ WarningResolver
 └ CacheSystem
```

### 18.1 RuleEngine

- 프로젝트별 탐지 룰 관리
- JSON/YAML 기반 외부 룰 확장 지원
- 점수 계산 담당

### 18.2 FileScanner

- 루트 파일 검색
- 특정 확장자 검색
- Ignore 목록 처리

### 18.3 DependencyAnalyzer

- `package.json`
- `.csproj`
- `pom.xml`
- `build.gradle`
- `requirements.txt`
- `pyproject.toml`

등의 의존성 분석 담당.

### 18.4 MonorepoAnalyzer

- 하위 프로젝트 탐지
- workspace 기반 구조 분석
- children 결과 생성

### 18.5 ConfidenceResolver

- Evidence 점수 합산
- 중복 점수 조정
- 최종 confidence 산출

---

## 19. 룰 정의 예시

```json
{
  "id": "unity",
  "displayName": "Unity",
  "category": "GameEngine",
  "rules": [
    {
      "type": "PathExists",
      "path": "ProjectSettings",
      "score": 40
    },
    {
      "type": "PathExists",
      "path": "Assets",
      "score": 20
    },
    {
      "type": "FileExists",
      "path": "Packages/manifest.json",
      "score": 30
    },
    {
      "type": "GlobExists",
      "pattern": "**/*.asmdef",
      "score": 15
    }
  ]
}
```

---

## 20. 구현 시 주의할 점

### 20.1 잘못된 확정 방지

`package.json` 하나만 있다고 React로 확정하면 안 된다.

가능성만 추가해야 한다.

### 20.2 중복 기술 스택 허용

Electron 프로젝트는 React, Vue, Vite와 함께 존재할 수 있다.

따라서 `PrimaryType`과 `Frameworks`를 분리해야 한다.

### 20.3 빌드 결과물만 있는 경우 처리

`dist/`, `build/`, `bin/`만 있는 경우 소스 프로젝트가 아닐 수 있다.

이 경우 `BuildOutputOnly` 경고를 제공한다.

### 20.4 모노레포 우선 고려

루트 하나만 분석하지 말고, 특정 깊이까지 하위 폴더를 탐색해 복수 프로젝트 여부를 확인해야 한다.

---

## 21. 핵심 결론

가장 중요한 것은 다음이다.

> 정확히 하나를 맞추는 것이 아니라, 가능성 높은 기술 스택을 구조적으로 설명하는 것.

실제 프로젝트는 다음처럼 다양하다.

- 복합 프레임워크
- 모노레포
- 부분 손상된 프로젝트
- 빈 템플릿
- 커스텀 구조
- Docker 기반 실행 구조
- 여러 플랫폼이 섞인 하이브리드 앱

따라서 최종 목표는 단순한 정답 판별기가 아니라 다음과 같은 시스템이어야 한다.

```txt
신뢰도 기반 프로젝트 분석 시스템
```
