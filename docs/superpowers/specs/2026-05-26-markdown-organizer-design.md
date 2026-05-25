# Markdown Organizer — 설계 문서

**날짜**: 2026-05-26  
**상태**: 승인됨  
**버전**: 1.0

---

## 1. 프로젝트 개요

AI가 생성한 Markdown 문서를 사용자가 효율적으로 탐색·열람·관리할 수 있는 데스크탑 앱.

**핵심 목표**: 단순 뷰어가 아닌 "AI 시대의 프로젝트 문서 운영 환경"

---

## 2. 확정된 선택사항

| 항목 | 결정 | 이유 |
|------|------|------|
| MVP 범위 | Full MVP | 프로젝트 유형 분석, TOC, Mermaid, SQLite 상태 저장 포함 |
| 프레임워크 | **Electron** | Tauri의 시스템 WebView 버전 불일치 문제 회피. Chromium 번들로 크로스플랫폼 렌더링 완전 일관 |
| 레이아웃 | Activity Bar + 3-Panel | 좌측 아이콘 사이드바로 프로젝트 전환 빠름. JetBrains/Zed 스타일 |
| 테마 | Catppuccin Mocha 기반 | 보라/파랑 소프트 다크. Dark + Black 2가지 테마 지원 |
| 플랫폼 | macOS + Windows + Linux | electron-builder로 크로스플랫폼 빌드 |
| 아키텍처 | Hybrid (Main/Renderer 분리) | FS·DB는 Main(Node.js), 렌더링은 Renderer(React) |

---

## 3. 기술 스택

### Electron Main Process (Node.js)

| 패키지 | 용도 |
|--------|------|
| `electron` | 앱 프레임워크 |
| `better-sqlite3` | SQLite 상태 저장 |
| `chokidar` | 파일 감시 (핫 리로드) |
| `electron-builder` | 크로스플랫폼 빌드/배포 |
| `electron-updater` | 자동 업데이트 |
| Node.js `fs` / `path` | 파일 시스템 |

### Electron Renderer (React)

| 패키지 | 용도 |
|--------|------|
| `react` 19 + TypeScript | UI |
| `zustand` | UI 상태 관리 |
| `remark` + `rehype` | Markdown 파싱·렌더링 |
| `shiki` | 코드 구문 강조 |
| `mermaid` | 다이어그램 렌더링 |
| `electron-vite` | 번들러 (Vite 기반) |
| `tailwindcss` | 스타일링 |
| `@tanstack/react-virtual` | FileTree 가상 스크롤 (10k+ 파일 대응) |

---

## 4. 아키텍처

### IPC 구조 (보안)

```
Main Process (Node.js)
  └─ ipcMain.handle(channel, handler)
       │
       │  IPC (보안 격리)
       │
Preload Script
  └─ contextBridge.exposeInMainWorld('api', { ... })
       │
       │  window.api.*
       │
Renderer (React)
  └─ Zustand Stores → Components
```

- `nodeIntegration: false` / `contextIsolation: true` — 보안 기본값 유지
- Renderer는 Node.js API에 직접 접근 불가. 모든 FS/DB 작업은 IPC 경유

### Zustand 스토어 책임

| 스토어 | 책임 |
|--------|------|
| `projectStore` | 등록 프로젝트 목록, 활성 프로젝트, 유형·아이콘 |
| `fileTreeStore` | 트리 데이터, 펼침/접힘 상태, 선택 파일, 필터 |
| `viewerStore` | 현재 문서 내용, 스크롤 위치, 탐색 히스토리, TOC 항목 |
| `uiStore` | 테마, 패널 너비, 사이드바 접힘 상태 |

---

## 5. 디렉터리 구조

```
src/
├── main/                    # Electron Main Process
│   ├── index.ts             # 앱 진입점, BrowserWindow 생성
│   ├── ipc/
│   │   ├── projects.ts      # 프로젝트 CRUD IPC 핸들러
│   │   ├── files.ts         # 파일 읽기/트리 IPC 핸들러
│   │   └── settings.ts      # 앱 설정 IPC 핸들러
│   ├── db/
│   │   ├── schema.ts        # SQLite 스키마 정의 및 마이그레이션
│   │   └── queries.ts       # 타입 안전 쿼리 함수
│   ├── watcher.ts           # chokidar 파일 감시, debounce 200ms
│   └── analyzer.ts          # 프로젝트 유형 자동 분석
├── preload/
│   └── index.ts             # contextBridge API 노출
└── renderer/                # React 앱
    ├── components/
    │   ├── ActivityBar/     # 프로젝트 아이콘 사이드바
    │   ├── FileTree/        # 가상 스크롤 트리
    │   ├── Viewer/          # Markdown 렌더러 + DocHeader
    │   ├── TocPanel/        # TOC 탐색창
    │   └── StatusBar/       # 하단 상태 표시줄
    ├── stores/              # Zustand 스토어
    ├── hooks/               # 공유 커스텀 훅
    └── types/               # 공유 TypeScript 타입
```

---

## 6. SQLite 스키마

```sql
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  path        TEXT NOT NULL UNIQUE,
  type        TEXT,            -- 'unity' | 'node' | 'rust' | 'docs' | ...
  icon        TEXT,
  last_opened INTEGER,         -- Unix timestamp
  created_at  INTEGER NOT NULL
);

CREATE TABLE project_state (
  project_id      TEXT PRIMARY KEY REFERENCES projects(id),
  last_file       TEXT,        -- 마지막 열람 파일 경로
  scroll_pos      INTEGER DEFAULT 0,
  expanded_dirs   TEXT,        -- JSON array of paths
  filters         TEXT,        -- JSON object
  search_history  TEXT         -- JSON array
);

CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
  -- theme, window_width, window_height, window_x, window_y, active_project_id
);
```

---

## 7. 핵심 데이터 흐름

### 7.1 문서 열기

1. `FileNode` 클릭 → `fileTreeStore.selectFile(path)`
2. `window.api.readFile(path)` IPC 호출
3. Main: `fs.readFile()` → UTF-8 string 반환
4. `viewerStore.setContent(raw)`
5. Renderer: remark 파이프라인 → Shiki 하이라이트 → Mermaid 렌더 → TOC 추출
6. `MarkdownRenderer` + `TocPanel` 동시 업데이트
7. SQLite `project_state` 업데이트 (last_file, scroll_pos)

### 7.2 앱 시작 — 상태 복원

1. Main `app.whenReady()` → SQLite open → `app_settings` 읽기
2. 이전 윈도우 크기/위치로 `BrowserWindow` 생성
3. Renderer mount → `window.api.getAppState()` 호출
4. `projectStore` → `fileTreeStore` → 마지막 문서 자동 열기 → 스크롤 위치 복원
5. chokidar 감시 시작

### 7.3 파일 변경 감지

1. chokidar 변경 감지 → 200ms debounce
2. 변경 유형 판별: 추가 / 수정 / 삭제
3. `win.webContents.send('file-changed', payload)`
4. Renderer `useEffect` 리스너 수신
5. 현재 열린 파일이면 자동 리로드, 아니면 `fileTreeStore`만 업데이트

---

## 8. UI 레이아웃

```
┌──────────────────────────────────────────┐
│ TitleBar (커스텀 드래그 영역)              │
├────┬──────────────┬──────────┬───────────┤
│    │              │          │           │
│ AB │  FileTree    │ Document │  TOC      │
│    │  Panel       │ Viewer   │  Panel    │
│    │              │          │           │
├────┴──────────────┴──────────┴───────────┤
│ StatusBar                                │
└──────────────────────────────────────────┘
AB = ActivityBar (프로젝트 아이콘 × n)
```

### 패널 너비 기본값

| 패널 | 기본 너비 | 최소 | 최대 |
|------|----------|------|------|
| ActivityBar | 48px | 48px | 48px (고정) |
| FileTree | 220px | 160px | 400px |
| DocumentViewer | 나머지 | 400px | — |
| TocPanel | 200px | 140px | 320px |

---

## 9. 에러 처리

### Main Process

| 에러 | 처리 |
|------|------|
| 파일 없음 / 권한 거부 | IPC error 반환 → Renderer 빈 상태 + 메시지 표시 |
| SQLite 실패 | 로그 기록 후 인메모리 fallback |
| 프로젝트 경로 소실 | 목록에 경고 배지 표시, 재등록 유도 |

### Renderer

| 에러 | 처리 |
|------|------|
| Markdown 파싱 실패 | raw 텍스트 fallback |
| Mermaid 문법 오류 | 다이어그램 위치에 인라인 오류 메시지 |
| 컴포넌트 충돌 | React `ErrorBoundary`로 패널 단위 격리 |
| 이미지 경로 오류 | alt 텍스트로 대체 |

---

## 10. 테스트 전략

| 레이어 | 도구 | 대상 |
|--------|------|------|
| Unit | Vitest | Zustand 스토어, analyzer.ts, TOC 파서, 날짜 계산, SQLite 쿼리 |
| Integration | Vitest | IPC 핸들러 입출력, 상태 저장·복원 사이클 |
| E2E | Playwright + `electron-playwright-helpers` | 프로젝트 등록→파일 열기, 앱 재시작→상태 복원, Mermaid 렌더, TOC 클릭→스크롤 |

---

## 11. 성능 목표

| 항목 | 목표값 |
|------|--------|
| FileTree 렌더 | 10,000+ 파일 — `@tanstack/react-virtual` 가상 스크롤 |
| 파일 열기 응답 | < 200ms (캐시 없는 첫 열기) |
| chokidar debounce | 200ms (불필요한 리로드 방지) |
| TOC 캐싱 | 동일 파일 재열기 시 파싱 skip |

---

## 12. 크로스플랫폼 빌드

| OS | 배포 포맷 |
|----|----------|
| macOS | `.dmg` / `.app` |
| Windows | `.exe` (NSIS 인스톨러) |
| Linux | `.AppImage` / `.deb` |

CI: GitHub Actions에서 3개 OS matrix 빌드 검증.

---

## 13. 향후 확장 (v2 이후)

- 전체 텍스트 검색 (Heading / 코드 / TODO)
- 탭 시스템 (멀티 문서 동시 열람)
- Git 연동 (변경 파일 강조, 마지막 커밋 정보)
- AI 연동 (문서 요약, 오래된 내용 검출)
- 문서 그래프 (Obsidian 스타일 관계 시각화)
- 커스텀 테마 / 사용자 CSS
