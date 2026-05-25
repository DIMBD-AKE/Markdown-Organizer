# Markdown Organizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Electron + React 데스크탑 앱으로 AI 생성 Markdown 문서를 프로젝트 기반으로 탐색·열람·관리한다.

**Architecture:** Main Process(Node.js)가 파일 시스템·SQLite·파일 감시를 담당하고, contextBridge IPC를 통해 Renderer(React)에 데이터를 제공한다. Renderer는 remark/rehype 파이프라인으로 Markdown을 렌더링하고 Zustand로 UI 상태를 관리한다.

**Tech Stack:** Electron 33, React 19, TypeScript, electron-vite, better-sqlite3, chokidar, remark+rehype, Shiki, Mermaid.js, Zustand, Tailwind CSS 4, @tanstack/react-virtual, Vitest, Playwright + electron-playwright-helpers

---

## 파일 구조 맵

```
package.json
electron.vite.config.ts
electron-builder.config.ts
tailwind.config.ts
vitest.config.ts
src/
  main/
    index.ts                    # BrowserWindow 생성, 앱 생명주기
    ipc/
      index.ts                  # 모든 IPC 핸들러 등록
      projects.ts               # 프로젝트 CRUD
      files.ts                  # readFile, getFileTree, getAppState
      settings.ts               # 테마, 윈도우 bounds
    db/
      index.ts                  # DB 싱글턴
      schema.ts                 # CREATE TABLE, 마이그레이션
      queries.ts                # 타입 안전 쿼리 함수
    watcher.ts                  # chokidar, 200ms debounce, IPC emit
    analyzer.ts                 # 프로젝트 유형 자동 분석
  preload/
    index.ts                    # contextBridge API 노출
    api.d.ts                    # window.api TypeScript 타입
  renderer/
    index.html
    src/
      main.tsx                  # React 진입점
      App.tsx                   # 루트 레이아웃
      components/
        TitleBar/TitleBar.tsx
        ActivityBar/
          ActivityBar.tsx
          ProjectIcon.tsx
        FileTree/
          FileTreePanel.tsx
          FileTree.tsx           # @tanstack/react-virtual 가상 스크롤
          FolderNode.tsx
          FileNode.tsx
          StatusDot.tsx          # 문서 신선도 색상 점
        Viewer/
          DocumentViewer.tsx
          DocHeader.tsx          # 브레드크럼 + FreshnessTag + 뒤로/앞으로
          MarkdownRenderer.tsx
          CodeBlock.tsx          # Shiki 구문 강조
          MermaidDiagram.tsx
        TocPanel/
          TocPanel.tsx
          TocTree.tsx
          TocItem.tsx
        StatusBar/StatusBar.tsx
        ErrorBoundary.tsx
      stores/
        projectStore.ts
        fileTreeStore.ts
        viewerStore.ts
        uiStore.ts
      hooks/
        useFileWatcher.ts       # 파일 변경 IPC 이벤트 구독
        useScrollSync.ts        # 뷰어 스크롤 ↔ TOC 하이라이트
      types/index.ts            # 공유 TypeScript 타입
tests/
  unit/
    analyzer.test.ts
    toc-parser.test.ts
    freshness.test.ts
    queries.test.ts
  integration/
    projects-ipc.test.ts
    files-ipc.test.ts
  e2e/
    app.test.ts
```

---

## Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `electron-builder.config.ts`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/App.tsx`

- [ ] **Step 1: electron-vite 프로젝트 생성**

```bash
npm create @quick-start/electron@latest markdown-organizer -- --template react-ts
cd markdown-organizer
```

- [ ] **Step 2: 의존성 설치**

```bash
npm install better-sqlite3 chokidar remark remark-gfm rehype-react rehype-raw \
  @shikijs/rehype mermaid zustand @tanstack/react-virtual \
  unified remark-rehype rehype-stringify

npm install -D @types/better-sqlite3 @types/node \
  tailwindcss @tailwindcss/vite \
  vitest @vitest/ui playwright electron-playwright-helpers \
  electron-builder
```

- [ ] **Step 3: electron.vite.config.ts 설정**

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: { '@renderer': resolve('src/renderer/src') }
    },
    plugins: [react(), tailwindcss()]
  }
})
```

- [ ] **Step 4: electron-builder.config.ts 설정**

```typescript
import { defineConfig } from 'electron-builder'

export default defineConfig({
  appId: 'com.markdown-organizer.app',
  productName: 'Markdown Organizer',
  directories: { buildResources: 'build' },
  files: ['out/**'],
  mac: { target: [{ target: 'dmg', arch: ['x64', 'arm64'] }] },
  win: { target: [{ target: 'nsis', arch: ['x64'] }] },
  linux: { target: ['AppImage', 'deb'] }
})
```

- [ ] **Step 5: tailwind.config.ts (Catppuccin Mocha 팔레트)**

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base:    '#1e1e2e',
        mantle:  '#181825',
        crust:   '#11111b',
        surface0:'#313244',
        surface1:'#45475a',
        overlay0:'#6c7086',
        text:    '#cdd6f4',
        subtext0:'#a6adc8',
        lavender:'#b4befe',
        mauve:   '#cba6f7',
        blue:    '#89b4fa',
        green:   '#a6e3a1',
        yellow:  '#f9e2af',
        red:     '#f38ba8',
        teal:    '#94e2d5',
      }
    }
  }
} satisfies Config
```

- [ ] **Step 6: vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    globals: true
  }
})
```

- [ ] **Step 7: src/types/index.ts 공유 타입 정의**

```typescript
// src/renderer/src/types/index.ts
export type ProjectType =
  | 'unity' | 'unreal' | 'node' | 'rust' | 'python'
  | 'ai-research' | 'docs' | 'unknown'

export interface Project {
  id: string
  name: string
  path: string
  type: ProjectType
  icon: string
  lastOpened: number | null
  createdAt: number
}

export interface FileNode {
  name: string
  path: string
  isDir: boolean
  children?: FileNode[]
  modifiedAt: number
  mdCount?: number
}

export interface ProjectState {
  projectId: string
  lastFile: string | null
  scrollPos: number
  expandedDirs: string[]
  searchHistory: string[]
}

export interface AppState {
  projects: Project[]
  activeProjectId: string | null
  projectStates: Record<string, ProjectState>
  theme: 'dark' | 'black'
  windowBounds: { width: number; height: number; x: number; y: number } | null
}

export interface TocItem {
  id: string
  text: string
  level: number
  children: TocItem[]
}

export type Freshness = 'fresh' | 'warn' | 'stale'
// fresh: ≤3일, warn: ≤30일, stale: >30일
```

- [ ] **Step 8: 빌드 확인**

```bash
npm run dev
```

Expected: Electron 창 열림, React 기본 화면 표시.

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "chore: scaffold Electron + React project with electron-vite"
```

---

## Task 2: SQLite 스키마 & DB 레이어

**Files:**
- Create: `src/main/db/index.ts`
- Create: `src/main/db/schema.ts`
- Create: `src/main/db/queries.ts`
- Test: `tests/unit/queries.test.ts`

- [ ] **Step 1: schema.ts 작성**

```typescript
// src/main/db/schema.ts
export const SCHEMA_VERSION = 1

export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    path        TEXT NOT NULL UNIQUE,
    type        TEXT NOT NULL DEFAULT 'unknown',
    icon        TEXT NOT NULL DEFAULT '📁',
    last_opened INTEGER,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_state (
    project_id      TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    last_file       TEXT,
    scroll_pos      INTEGER NOT NULL DEFAULT 0,
    expanded_dirs   TEXT NOT NULL DEFAULT '[]',
    search_history  TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
  );
`
```

- [ ] **Step 2: db/index.ts — 싱글턴**

```typescript
// src/main/db/index.ts
import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { CREATE_TABLES, SCHEMA_VERSION } from './schema'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db
  const dbPath = path.join(app.getPath('userData'), 'organizer.db')
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.exec(CREATE_TABLES)
  const row = _db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined
  if (!row) {
    _db.prepare('INSERT INTO schema_version VALUES (?)').run(SCHEMA_VERSION)
  }
  return _db
}

export function closeDb(): void {
  _db?.close()
  _db = null
}
```

- [ ] **Step 3: queries.ts 작성**

```typescript
// src/main/db/queries.ts
import type { Database } from 'better-sqlite3'
import type { Project, ProjectState } from '../../renderer/src/types'

export function getAllProjects(db: Database): Project[] {
  return db.prepare(`
    SELECT id, name, path, type, icon,
           last_opened as lastOpened, created_at as createdAt
    FROM projects ORDER BY last_opened DESC NULLS LAST
  `).all() as Project[]
}

export function upsertProject(db: Database, p: Project): void {
  db.prepare(`
    INSERT INTO projects (id, name, path, type, icon, last_opened, created_at)
    VALUES (@id, @name, @path, @type, @icon, @lastOpened, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, type=excluded.type, icon=excluded.icon,
      last_opened=excluded.last_opened
  `).run({ ...p, lastOpened: p.lastOpened ?? null })
}

export function deleteProject(db: Database, id: string): void {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
}

export function getProjectState(db: Database, projectId: string): ProjectState | null {
  const row = db.prepare('SELECT * FROM project_state WHERE project_id = ?').get(projectId) as any
  if (!row) return null
  return {
    projectId: row.project_id,
    lastFile: row.last_file,
    scrollPos: row.scroll_pos,
    expandedDirs: JSON.parse(row.expanded_dirs),
    searchHistory: JSON.parse(row.search_history)
  }
}

export function upsertProjectState(db: Database, state: ProjectState): void {
  db.prepare(`
    INSERT INTO project_state (project_id, last_file, scroll_pos, expanded_dirs, search_history)
    VALUES (@projectId, @lastFile, @scrollPos, @expandedDirs, @searchHistory)
    ON CONFLICT(project_id) DO UPDATE SET
      last_file=excluded.last_file, scroll_pos=excluded.scroll_pos,
      expanded_dirs=excluded.expanded_dirs, search_history=excluded.search_history
  `).run({
    projectId: state.projectId,
    lastFile: state.lastFile,
    scrollPos: state.scrollPos,
    expandedDirs: JSON.stringify(state.expandedDirs),
    searchHistory: JSON.stringify(state.searchHistory)
  })
}

export function getSetting(db: Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(db: Database, key: string, value: string): void {
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(key, value)
}
```

- [ ] **Step 4: 테스트 작성**

```typescript
// tests/unit/queries.test.ts
import Database from 'better-sqlite3'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CREATE_TABLES } from '../../src/main/db/schema'
import {
  getAllProjects, upsertProject, deleteProject,
  getProjectState, upsertProjectState,
  getSetting, setSetting
} from '../../src/main/db/queries'
import type { Project, ProjectState } from '../../src/renderer/src/types'

function makeTestDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(CREATE_TABLES)
  return db
}

const sampleProject: Project = {
  id: 'proj-1',
  name: 'Test Project',
  path: '/tmp/test',
  type: 'docs',
  icon: '📝',
  lastOpened: null,
  createdAt: Date.now()
}

describe('queries', () => {
  let db: Database.Database

  beforeEach(() => { db = makeTestDb() })
  afterEach(() => db.close())

  it('upsertProject → getAllProjects returns project', () => {
    upsertProject(db, sampleProject)
    const projects = getAllProjects(db)
    expect(projects).toHaveLength(1)
    expect(projects[0].id).toBe('proj-1')
    expect(projects[0].name).toBe('Test Project')
  })

  it('deleteProject removes project', () => {
    upsertProject(db, sampleProject)
    deleteProject(db, 'proj-1')
    expect(getAllProjects(db)).toHaveLength(0)
  })

  it('upsertProjectState → getProjectState round-trips', () => {
    upsertProject(db, sampleProject)
    const state: ProjectState = {
      projectId: 'proj-1',
      lastFile: '/tmp/test/doc.md',
      scrollPos: 150,
      expandedDirs: ['/tmp/test/docs'],
      searchHistory: ['ecs', 'render']
    }
    upsertProjectState(db, state)
    const got = getProjectState(db, 'proj-1')
    expect(got?.scrollPos).toBe(150)
    expect(got?.expandedDirs).toEqual(['/tmp/test/docs'])
    expect(got?.searchHistory).toEqual(['ecs', 'render'])
  })

  it('getSetting / setSetting round-trips', () => {
    setSetting(db, 'theme', 'dark')
    expect(getSetting(db, 'theme')).toBe('dark')
    setSetting(db, 'theme', 'black')
    expect(getSetting(db, 'theme')).toBe('black')
  })
})
```

- [ ] **Step 5: 테스트 실행 — FAIL 확인**

```bash
npx vitest run tests/unit/queries.test.ts
```

Expected: 모듈 없음 오류 (queries.ts 미작성 전 실행 시), 또는 PASS (이미 작성했으므로 PASS 예상).

- [ ] **Step 6: 테스트 실행 — PASS 확인**

```bash
npx vitest run tests/unit/queries.test.ts
```

Expected: 4개 tests PASS.

- [ ] **Step 7: 커밋**

```bash
git add src/main/db/ tests/unit/queries.test.ts
git commit -m "feat: SQLite schema and typed query layer"
```

---

## Task 3: 프로젝트 유형 분석기

**Files:**
- Create: `src/main/analyzer.ts`
- Test: `tests/unit/analyzer.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// tests/unit/analyzer.test.ts
import { describe, it, expect } from 'vitest'
import { analyzeProjectType } from '../../src/main/analyzer'

describe('analyzeProjectType', () => {
  it('detects Unity project by Assets/ dir', () => {
    expect(analyzeProjectType(['Assets', 'ProjectSettings', 'Packages'])).toBe('unity')
  })

  it('detects Unreal by .uproject file', () => {
    expect(analyzeProjectType(['MyGame.uproject', 'Source', 'Content'])).toBe('unreal')
  })

  it('detects Node.js by package.json', () => {
    expect(analyzeProjectType(['package.json', 'src', 'node_modules'])).toBe('node')
  })

  it('detects Rust by Cargo.toml', () => {
    expect(analyzeProjectType(['Cargo.toml', 'src', 'target'])).toBe('rust')
  })

  it('detects Python by requirements.txt', () => {
    expect(analyzeProjectType(['requirements.txt', 'main.py'])).toBe('python')
  })

  it('detects docs project by docs/ dir without code markers', () => {
    expect(analyzeProjectType(['docs', 'README.md', 'wiki'])).toBe('docs')
  })

  it('returns unknown for unrecognized structure', () => {
    expect(analyzeProjectType(['random', 'files'])).toBe('unknown')
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npx vitest run tests/unit/analyzer.test.ts
```

Expected: FAIL — `analyzeProjectType` not found.

- [ ] **Step 3: analyzer.ts 구현**

```typescript
// src/main/analyzer.ts
import type { ProjectType } from '../renderer/src/types'

interface Rule {
  type: ProjectType
  match: (entries: string[]) => boolean
  icon: string
}

const RULES: Rule[] = [
  {
    type: 'unity',
    icon: '🎮',
    match: (e) => e.includes('Assets') && e.includes('ProjectSettings')
  },
  {
    type: 'unreal',
    icon: '🎮',
    match: (e) => e.some((f) => f.endsWith('.uproject'))
  },
  {
    type: 'node',
    icon: '🟢',
    match: (e) => e.includes('package.json')
  },
  {
    type: 'rust',
    icon: '🦀',
    match: (e) => e.includes('Cargo.toml')
  },
  {
    type: 'python',
    icon: '🐍',
    match: (e) => e.includes('requirements.txt') || e.includes('pyproject.toml')
  },
  {
    type: 'docs',
    icon: '📚',
    match: (e) => e.some((f) => ['docs', 'wiki', 'notes'].includes(f.toLowerCase()))
  }
]

export function analyzeProjectType(rootEntries: string[]): ProjectType {
  for (const rule of RULES) {
    if (rule.match(rootEntries)) return rule.type
  }
  return 'unknown'
}

export function getProjectIcon(type: ProjectType): string {
  return RULES.find((r) => r.type === type)?.icon ?? '📁'
}

export function analyzeDirectory(dirPath: string): { type: ProjectType; icon: string } {
  const fs = require('fs') as typeof import('fs')
  let entries: string[] = []
  try {
    entries = fs.readdirSync(dirPath).map((e: string) => e)
  } catch {
    return { type: 'unknown', icon: '📁' }
  }
  const type = analyzeProjectType(entries)
  const icon = getProjectIcon(type)
  return { type, icon }
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
npx vitest run tests/unit/analyzer.test.ts
```

Expected: 7개 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/main/analyzer.ts tests/unit/analyzer.test.ts
git commit -m "feat: project type auto-analyzer"
```

---

## Task 4: 문서 신선도 & TOC 파서 유틸

**Files:**
- Create: `src/renderer/src/utils/freshness.ts`
- Create: `src/renderer/src/utils/toc.ts`
- Test: `tests/unit/freshness.test.ts`
- Test: `tests/unit/toc-parser.test.ts`

- [ ] **Step 1: freshness 테스트 작성**

```typescript
// tests/unit/freshness.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getFreshness, getFreshnessColor } from '../../src/renderer/src/utils/freshness'

describe('getFreshness', () => {
  const NOW = new Date('2026-05-26').getTime()

  beforeEach(() => { vi.setSystemTime(NOW) })
  afterEach(() => { vi.useRealTimers() })

  it('returns fresh for file modified 1 day ago', () => {
    const ts = NOW - 1 * 24 * 60 * 60 * 1000
    expect(getFreshness(ts)).toBe('fresh')
  })

  it('returns warn for file modified 20 days ago', () => {
    const ts = NOW - 20 * 24 * 60 * 60 * 1000
    expect(getFreshness(ts)).toBe('warn')
  })

  it('returns stale for file modified 91 days ago', () => {
    const ts = NOW - 91 * 24 * 60 * 60 * 1000
    expect(getFreshness(ts)).toBe('stale')
  })
})

describe('getFreshnessColor', () => {
  it('maps fresh → green', () => expect(getFreshnessColor('fresh')).toBe('#a6e3a1'))
  it('maps warn → yellow', () => expect(getFreshnessColor('warn')).toBe('#f9e2af'))
  it('maps stale → red', () => expect(getFreshnessColor('stale')).toBe('#f38ba8'))
})
```

- [ ] **Step 2: freshness.ts 구현**

```typescript
// src/renderer/src/utils/freshness.ts
import type { Freshness } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

export function getFreshness(modifiedAtMs: number): Freshness {
  const days = (Date.now() - modifiedAtMs) / DAY_MS
  if (days <= 3) return 'fresh'
  if (days <= 30) return 'warn'
  return 'stale'
}

export function getFreshnessColor(f: Freshness): string {
  return { fresh: '#a6e3a1', warn: '#f9e2af', stale: '#f38ba8' }[f]
}

export function formatAge(modifiedAtMs: number): string {
  const days = Math.floor((Date.now() - modifiedAtMs) / DAY_MS)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}
```

- [ ] **Step 3: TOC 파서 테스트 작성**

```typescript
// tests/unit/toc-parser.test.ts
import { describe, it, expect } from 'vitest'
import { extractToc } from '../../src/renderer/src/utils/toc'

const MARKDOWN = `
# Introduction
Some text.
## ECS Architecture
### Component
### System
## Rendering
# Conclusion
`

describe('extractToc', () => {
  it('extracts headings with correct levels', () => {
    const toc = extractToc(MARKDOWN)
    expect(toc).toHaveLength(2) // 2 h1 items
    expect(toc[0].text).toBe('Introduction')
    expect(toc[0].level).toBe(1)
    expect(toc[0].children).toHaveLength(2) // h2: ECS Architecture, Rendering
    expect(toc[0].children[0].text).toBe('ECS Architecture')
    expect(toc[0].children[0].children).toHaveLength(2) // h3: Component, System
  })

  it('generates slug ids', () => {
    const toc = extractToc('# Hello World\n## My Section')
    expect(toc[0].id).toBe('hello-world')
    expect(toc[0].children[0].id).toBe('my-section')
  })

  it('returns empty array for no headings', () => {
    expect(extractToc('Just some text.')).toEqual([])
  })
})
```

- [ ] **Step 4: toc.ts 구현**

```typescript
// src/renderer/src/utils/toc.ts
import type { TocItem } from '../types'

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
}

export function extractToc(markdown: string): TocItem[] {
  const headingRe = /^(#{1,6})\s+(.+)$/gm
  const flat: { level: number; text: string; id: string }[] = []
  let match: RegExpExecArray | null

  while ((match = headingRe.exec(markdown)) !== null) {
    flat.push({ level: match[1].length, text: match[2].trim(), id: slugify(match[2].trim()) })
  }

  if (flat.length === 0) return []

  const root: TocItem[] = []
  const stack: TocItem[] = []

  for (const h of flat) {
    const item: TocItem = { id: h.id, text: h.text, level: h.level, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop()
    }
    if (stack.length === 0) {
      root.push(item)
    } else {
      stack[stack.length - 1].children.push(item)
    }
    stack.push(item)
  }

  return root
}
```

- [ ] **Step 5: 테스트 실행 — PASS 확인**

```bash
npx vitest run tests/unit/freshness.test.ts tests/unit/toc-parser.test.ts
```

Expected: 7개 tests PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/renderer/src/utils/ tests/unit/freshness.test.ts tests/unit/toc-parser.test.ts
git commit -m "feat: freshness calculator and TOC parser utilities"
```

---

## Task 5: 파일 시스템 & Watcher — Main Process

**Files:**
- Create: `src/main/watcher.ts`
- Modify: `src/main/db/queries.ts` (getFileTree 추가)

- [ ] **Step 1: 파일 트리 빌더 함수 추가 (queries.ts 아님, 별도 fs 유틸)**

```typescript
// src/main/fs.ts
import fs from 'fs'
import path from 'path'
import type { FileNode } from '../renderer/src/types'

export function buildFileTree(dirPath: string): FileNode {
  const stat = fs.statSync(dirPath)
  const name = path.basename(dirPath)

  if (!stat.isDirectory()) {
    return { name, path: dirPath, isDir: false, modifiedAt: stat.mtimeMs }
  }

  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch { /* 권한 없는 디렉터리 skip */ }

  // 숨김 파일 제외
  const visible = entries.filter((e) => !e.name.startsWith('.'))
  const dirs = visible.filter((e) => e.isDirectory())
  const files = visible.filter((e) => !e.isDirectory() && e.name.endsWith('.md'))

  const children: FileNode[] = [
    ...dirs.map((d) => buildFileTree(path.join(dirPath, d.name))),
    ...files.map((f) => {
      const fp = path.join(dirPath, f.name)
      const s = fs.statSync(fp)
      return { name: f.name, path: fp, isDir: false, modifiedAt: s.mtimeMs }
    })
  ]

  const mdCount = countMd(children)
  return { name, path: dirPath, isDir: true, children, modifiedAt: stat.mtimeMs, mdCount }
}

function countMd(nodes: FileNode[]): number {
  return nodes.reduce((acc, n) => {
    if (!n.isDir) return acc + 1
    return acc + (n.mdCount ?? 0)
  }, 0)
}
```

- [ ] **Step 2: watcher.ts 구현**

```typescript
// src/main/watcher.ts
import chokidar, { FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'

let watcher: FSWatcher | null = null

export function startWatcher(projectPath: string, win: BrowserWindow): void {
  stopWatcher()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  watcher = chokidar.watch(projectPath, {
    ignored: /(^|[/\\])\../,   // 숨김 파일 제외
    ignoreInitial: true,
    depth: 10
  })

  const emit = (type: 'add' | 'change' | 'unlink', filePath: string) => {
    if (!filePath.endsWith('.md') && !isDir(filePath)) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      win.webContents.send('file-changed', { type, path: filePath })
    }, 200)
  }

  watcher.on('add', (p) => emit('add', p))
  watcher.on('change', (p) => emit('change', p))
  watcher.on('unlink', (p) => emit('unlink', p))
  watcher.on('addDir', (p) => emit('add', p))
  watcher.on('unlinkDir', (p) => emit('unlink', p))
}

export function stopWatcher(): void {
  watcher?.close()
  watcher = null
}

function isDir(p: string): boolean {
  try {
    const fs = require('fs') as typeof import('fs')
    return fs.statSync(p).isDirectory()
  } catch { return false }
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/main/fs.ts src/main/watcher.ts
git commit -m "feat: file tree builder and chokidar file watcher"
```

---

## Task 6: IPC 핸들러 & Preload Bridge

**Files:**
- Create: `src/main/ipc/index.ts`
- Create: `src/main/ipc/projects.ts`
- Create: `src/main/ipc/files.ts`
- Create: `src/main/ipc/settings.ts`
- Create: `src/preload/index.ts`
- Create: `src/preload/api.d.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: IPC 채널 상수 정의**

```typescript
// src/main/ipc/channels.ts
export const IPC = {
  GET_APP_STATE:      'get-app-state',
  GET_FILE_TREE:      'get-file-tree',
  READ_FILE:          'read-file',
  ADD_PROJECT:        'add-project',
  REMOVE_PROJECT:     'remove-project',
  SET_ACTIVE_PROJECT: 'set-active-project',
  SAVE_PROJECT_STATE: 'save-project-state',
  GET_SETTING:        'get-setting',
  SET_SETTING:        'set-setting',
  SELECT_FOLDER:      'select-folder',
  FILE_CHANGED:       'file-changed'    // main→renderer event
} as const
```

- [ ] **Step 2: projects.ts IPC 핸들러**

```typescript
// src/main/ipc/projects.ts
import { ipcMain, dialog } from 'electron'
import { randomUUID } from 'crypto'
import { IPC } from './channels'
import { getDb } from '../db'
import { getAllProjects, upsertProject, deleteProject, upsertProjectState } from '../db/queries'
import { analyzeDirectory } from '../analyzer'
import type { Project, ProjectState } from '../../renderer/src/types'

export function registerProjectHandlers(): void {
  ipcMain.handle(IPC.SELECT_FOLDER, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.ADD_PROJECT, async (_e, folderPath: string) => {
    const db = getDb()
    const { type, icon } = analyzeDirectory(folderPath)
    const project: Project = {
      id: randomUUID(),
      name: require('path').basename(folderPath),
      path: folderPath,
      type,
      icon,
      lastOpened: Date.now(),
      createdAt: Date.now()
    }
    upsertProject(db, project)
    return project
  })

  ipcMain.handle(IPC.REMOVE_PROJECT, async (_e, id: string) => {
    deleteProject(getDb(), id)
  })

  ipcMain.handle(IPC.SAVE_PROJECT_STATE, async (_e, state: ProjectState) => {
    upsertProjectState(getDb(), state)
  })
}
```

- [ ] **Step 3: files.ts IPC 핸들러**

```typescript
// src/main/ipc/files.ts
import { ipcMain } from 'electron'
import fs from 'fs'
import { IPC } from './channels'
import { getDb } from '../db'
import { getAllProjects, getProjectState, getSetting } from '../db/queries'
import { buildFileTree } from '../fs'
import type { AppState } from '../../renderer/src/types'

export function registerFileHandlers(): void {
  ipcMain.handle(IPC.GET_FILE_TREE, async (_e, dirPath: string) => {
    return buildFileTree(dirPath)
  })

  ipcMain.handle(IPC.READ_FILE, async (_e, filePath: string) => {
    try {
      return { content: fs.readFileSync(filePath, 'utf-8'), error: null }
    } catch (err: any) {
      return { content: null, error: err.message as string }
    }
  })

  ipcMain.handle(IPC.GET_APP_STATE, async (): Promise<AppState> => {
    const db = getDb()
    const projects = getAllProjects(db)
    const activeProjectId = getSetting(db, 'active_project_id')
    const projectStates: AppState['projectStates'] = {}
    for (const p of projects) {
      const state = getProjectState(db, p.id)
      if (state) projectStates[p.id] = state
    }
    const theme = (getSetting(db, 'theme') ?? 'dark') as 'dark' | 'black'
    return { projects, activeProjectId, projectStates, theme, windowBounds: null }
  })
}
```

- [ ] **Step 4: settings.ts IPC 핸들러**

```typescript
// src/main/ipc/settings.ts
import { ipcMain } from 'electron'
import { IPC } from './channels'
import { getDb } from '../db'
import { getSetting, setSetting } from '../db/queries'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.GET_SETTING, async (_e, key: string) => getSetting(getDb(), key))
  ipcMain.handle(IPC.SET_SETTING, async (_e, key: string, value: string) => {
    setSetting(getDb(), key, value)
  })
}
```

- [ ] **Step 5: ipc/index.ts**

```typescript
// src/main/ipc/index.ts
import { registerProjectHandlers } from './projects'
import { registerFileHandlers } from './files'
import { registerSettingsHandlers } from './settings'

export function registerAllHandlers(): void {
  registerProjectHandlers()
  registerFileHandlers()
  registerSettingsHandlers()
}
```

- [ ] **Step 6: preload/index.ts (contextBridge)**

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../main/ipc/channels'

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke(IPC.SELECT_FOLDER),
  addProject: (path: string) => ipcRenderer.invoke(IPC.ADD_PROJECT, path),
  removeProject: (id: string) => ipcRenderer.invoke(IPC.REMOVE_PROJECT, id),
  saveProjectState: (state: unknown) => ipcRenderer.invoke(IPC.SAVE_PROJECT_STATE, state),

  getFileTree: (dirPath: string) => ipcRenderer.invoke(IPC.GET_FILE_TREE, dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke(IPC.READ_FILE, filePath),
  getAppState: () => ipcRenderer.invoke(IPC.GET_APP_STATE),

  getSetting: (key: string) => ipcRenderer.invoke(IPC.GET_SETTING, key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke(IPC.SET_SETTING, key, value),

  onFileChanged: (cb: (payload: { type: string; path: string }) => void) => {
    ipcRenderer.on(IPC.FILE_CHANGED, (_e, payload) => cb(payload))
    return () => ipcRenderer.removeAllListeners(IPC.FILE_CHANGED)
  }
})
```

- [ ] **Step 7: preload/api.d.ts**

```typescript
// src/preload/api.d.ts
import type { Project, ProjectState, FileNode, AppState } from '../renderer/src/types'

declare global {
  interface Window {
    api: {
      selectFolder(): Promise<string | null>
      addProject(path: string): Promise<Project>
      removeProject(id: string): Promise<void>
      saveProjectState(state: ProjectState): Promise<void>

      getFileTree(dirPath: string): Promise<FileNode>
      readFile(filePath: string): Promise<{ content: string | null; error: string | null }>
      getAppState(): Promise<AppState>

      getSetting(key: string): Promise<string | null>
      setSetting(key: string, value: string): Promise<void>

      onFileChanged(cb: (payload: { type: string; path: string }) => void): () => void
    }
  }
}
```

- [ ] **Step 8: src/main/index.ts 업데이트**

```typescript
// src/main/index.ts
import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { registerAllHandlers } from './ipc'
import { getDb, closeDb } from './db'
import { getSetting, setSetting } from './db/queries'
import { startWatcher, stopWatcher } from './watcher'

function createWindow(): BrowserWindow {
  const db = getDb()
  const w = parseInt(getSetting(db, 'window_width') ?? '1280', 10)
  const h = parseInt(getSetting(db, 'window_height') ?? '800', 10)

  const win = new BrowserWindow({
    width: w, height: h,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('resize', () => {
    const [width, height] = win.getSize()
    setSetting(db, 'window_width', String(width))
    setSetting(db, 'window_height', String(height))
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  registerAllHandlers()
  const win = createWindow()

  // 활성 프로젝트 경로가 있으면 watcher 시작
  const db = getDb()
  const activeId = getSetting(db, 'active_project_id')
  if (activeId) {
    const { getAllProjects } = require('./db/queries')
    const projects = getAllProjects(db)
    const active = projects.find((p: any) => p.id === activeId)
    if (active) startWatcher(active.path, win)
  }
})

app.on('window-all-closed', () => {
  stopWatcher()
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 9: 앱 실행 — IPC 동작 확인**

```bash
npm run dev
```

DevTools Console에서: `await window.api.getAppState()` → `{projects: [], activeProjectId: null, ...}` 반환 확인.

- [ ] **Step 10: 커밋**

```bash
git add src/main/ src/preload/
git commit -m "feat: IPC handlers and contextBridge preload API"
```

---

## Task 7: Zustand 스토어 & 앱 초기화

**Files:**
- Create: `src/renderer/src/stores/projectStore.ts`
- Create: `src/renderer/src/stores/fileTreeStore.ts`
- Create: `src/renderer/src/stores/viewerStore.ts`
- Create: `src/renderer/src/stores/uiStore.ts`
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/main.tsx`

- [ ] **Step 1: projectStore.ts**

```typescript
// src/renderer/src/stores/projectStore.ts
import { create } from 'zustand'
import type { Project } from '../types'

interface ProjectStore {
  projects: Project[]
  activeProjectId: string | null
  setProjects(projects: Project[]): void
  setActiveProject(id: string | null): void
  addProject(project: Project): void
  removeProject(id: string): void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProjectId: null,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProjectId) => set({ activeProjectId }),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
}))

export const activeProject = (s: ReturnType<typeof useProjectStore.getState>) =>
  s.projects.find((p) => p.id === s.activeProjectId) ?? null
```

- [ ] **Step 2: fileTreeStore.ts**

```typescript
// src/renderer/src/stores/fileTreeStore.ts
import { create } from 'zustand'
import type { FileNode } from '../types'

interface FileTreeStore {
  tree: FileNode | null
  expandedDirs: Set<string>
  selectedFile: string | null
  isLoading: boolean
  setTree(tree: FileNode | null): void
  setSelectedFile(path: string | null): void
  toggleDir(path: string): void
  setExpandedDirs(paths: string[]): void
  setLoading(v: boolean): void
}

export const useFileTreeStore = create<FileTreeStore>((set) => ({
  tree: null,
  expandedDirs: new Set(),
  selectedFile: null,
  isLoading: false,
  setTree: (tree) => set({ tree }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  toggleDir: (path) =>
    set((s) => {
      const next = new Set(s.expandedDirs)
      next.has(path) ? next.delete(path) : next.add(path)
      return { expandedDirs: next }
    }),
  setExpandedDirs: (paths) => set({ expandedDirs: new Set(paths) }),
  setLoading: (isLoading) => set({ isLoading })
}))
```

- [ ] **Step 3: viewerStore.ts**

```typescript
// src/renderer/src/stores/viewerStore.ts
import { create } from 'zustand'
import type { TocItem } from '../types'

interface ViewerStore {
  filePath: string | null
  content: string | null
  toc: TocItem[]
  scrollPos: number
  history: string[]
  historyIndex: number
  error: string | null
  setFile(path: string, content: string): void
  setToc(toc: TocItem[]): void
  setScrollPos(pos: number): void
  setError(err: string | null): void
  navigateTo(path: string): void
  goBack(): string | null
  goForward(): string | null
}

export const useViewerStore = create<ViewerStore>((set, get) => ({
  filePath: null,
  content: null,
  toc: [],
  scrollPos: 0,
  history: [],
  historyIndex: -1,
  error: null,
  setFile: (path, content) =>
    set((s) => {
      const history = [...s.history.slice(0, s.historyIndex + 1), path]
      return { filePath: path, content, error: null, history, historyIndex: history.length - 1 }
    }),
  setToc: (toc) => set({ toc }),
  setScrollPos: (scrollPos) => set({ scrollPos }),
  setError: (error) => set({ error }),
  navigateTo: (path) => set((s) => {
    const history = [...s.history.slice(0, s.historyIndex + 1), path]
    return { history, historyIndex: history.length - 1 }
  }),
  goBack: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return null
    const newIndex = historyIndex - 1
    set({ historyIndex: newIndex })
    return history[newIndex]
  },
  goForward: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return null
    const newIndex = historyIndex + 1
    set({ historyIndex: newIndex })
    return history[newIndex]
  }
}))
```

- [ ] **Step 4: uiStore.ts**

```typescript
// src/renderer/src/stores/uiStore.ts
import { create } from 'zustand'

interface UiStore {
  theme: 'dark' | 'black'
  fileTreeWidth: number
  tocWidth: number
  isFileTreeCollapsed: boolean
  isTocCollapsed: boolean
  setTheme(theme: 'dark' | 'black'): void
  setFileTreeWidth(w: number): void
  setTocWidth(w: number): void
  toggleFileTree(): void
  toggleToc(): void
}

export const useUiStore = create<UiStore>((set) => ({
  theme: 'dark',
  fileTreeWidth: 220,
  tocWidth: 200,
  isFileTreeCollapsed: false,
  isTocCollapsed: false,
  setTheme: (theme) => set({ theme }),
  setFileTreeWidth: (fileTreeWidth) => set({ fileTreeWidth }),
  setTocWidth: (tocWidth) => set({ tocWidth }),
  toggleFileTree: () => set((s) => ({ isFileTreeCollapsed: !s.isFileTreeCollapsed })),
  toggleToc: () => set((s) => ({ isTocCollapsed: !s.isTocCollapsed }))
}))
```

- [ ] **Step 5: App.tsx — 앱 초기화 & 레이아웃 뼈대**

```typescript
// src/renderer/src/App.tsx
import { useEffect } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'

export default function App() {
  const { setProjects, setActiveProject } = useProjectStore()
  const { setTheme } = useUiStore()

  useEffect(() => {
    window.api.getAppState().then((state) => {
      setProjects(state.projects)
      setActiveProject(state.activeProjectId)
      setTheme(state.theme)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen bg-base text-text select-none">
      <div className="flex flex-1 overflow-hidden">
        {/* ActivityBar, FileTreePanel, DocumentViewer, TocPanel — Task 8 이후 추가 */}
        <div className="flex-1 flex items-center justify-center text-overlay0">
          프로젝트를 등록하세요
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 앱 실행 — 스토어 초기화 확인**

```bash
npm run dev
```

Expected: 앱 실행, "프로젝트를 등록하세요" 텍스트 표시.

- [ ] **Step 7: 커밋**

```bash
git add src/renderer/src/stores/ src/renderer/src/App.tsx
git commit -m "feat: Zustand stores and app state initialization"
```

---

## Task 8: ActivityBar & 프로젝트 관리 UI

**Files:**
- Create: `src/renderer/src/components/ActivityBar/ActivityBar.tsx`
- Create: `src/renderer/src/components/ActivityBar/ProjectIcon.tsx`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: ProjectIcon.tsx**

```typescript
// src/renderer/src/components/ActivityBar/ProjectIcon.tsx
interface Props {
  icon: string
  name: string
  isActive: boolean
  onClick(): void
}

export default function ProjectIcon({ icon, name, isActive, onClick }: Props) {
  return (
    <button
      title={name}
      onClick={onClick}
      className={`
        w-9 h-9 rounded-lg flex items-center justify-center text-lg
        transition-colors duration-150
        ${isActive
          ? 'bg-surface0 text-text'
          : 'text-overlay0 hover:text-text hover:bg-surface0/50'}
      `}
    >
      {icon}
    </button>
  )
}
```

- [ ] **Step 2: ActivityBar.tsx**

```typescript
// src/renderer/src/components/ActivityBar/ActivityBar.tsx
import { useProjectStore } from '../../stores/projectStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import ProjectIcon from './ProjectIcon'

export default function ActivityBar() {
  const { projects, activeProjectId, setActiveProject } = useProjectStore()
  const { setTree, setLoading } = useFileTreeStore()

  async function handleAddProject() {
    const folderPath = await window.api.selectFolder()
    if (!folderPath) return
    const project = await window.api.addProject(folderPath)
    useProjectStore.getState().addProject(project)
    selectProject(project.id, project.path)
  }

  async function selectProject(id: string, path: string) {
    setActiveProject(id)
    window.api.setSetting('active_project_id', id)
    setLoading(true)
    const tree = await window.api.getFileTree(path)
    setTree(tree)
    setLoading(false)
  }

  return (
    <aside className="w-12 flex flex-col items-center py-2 gap-1 bg-mantle border-r border-surface0">
      {projects.map((p) => (
        <ProjectIcon
          key={p.id}
          icon={p.icon}
          name={p.name}
          isActive={p.id === activeProjectId}
          onClick={() => selectProject(p.id, p.path)}
        />
      ))}

      <div className="flex-1" />

      <button
        title="프로젝트 추가"
        onClick={handleAddProject}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-overlay0 hover:text-text hover:bg-surface0/50 text-xl transition-colors"
      >
        +
      </button>
    </aside>
  )
}
```

- [ ] **Step 3: App.tsx에 ActivityBar 추가**

```typescript
// src/renderer/src/App.tsx
import { useEffect } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'
import ActivityBar from './components/ActivityBar/ActivityBar'

export default function App() {
  const { setProjects, setActiveProject } = useProjectStore()
  const { setTheme } = useUiStore()

  useEffect(() => {
    window.api.getAppState().then((state) => {
      setProjects(state.projects)
      setActiveProject(state.activeProjectId)
      setTheme(state.theme)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen bg-base text-text select-none">
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <div className="flex-1 flex items-center justify-center text-overlay0 text-sm">
          파일을 선택하세요
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 앱 실행 — 프로젝트 추가 확인**

```bash
npm run dev
```

Expected: 좌측 ActivityBar 표시, + 버튼으로 폴더 선택 후 프로젝트 아이콘 추가됨.

- [ ] **Step 5: 커밋**

```bash
git add src/renderer/src/components/ActivityBar/
git commit -m "feat: ActivityBar with project add/switch"
```

---

## Task 9: FileTree 패널 (가상 스크롤)

**Files:**
- Create: `src/renderer/src/components/FileTree/FileTreePanel.tsx`
- Create: `src/renderer/src/components/FileTree/FileTree.tsx`
- Create: `src/renderer/src/components/FileTree/FileNode.tsx`
- Create: `src/renderer/src/components/FileTree/StatusDot.tsx`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: StatusDot.tsx**

```typescript
// src/renderer/src/components/FileTree/StatusDot.tsx
import { getFreshness, getFreshnessColor } from '../../utils/freshness'

export default function StatusDot({ modifiedAt }: { modifiedAt: number }) {
  const freshness = getFreshness(modifiedAt)
  const color = getFreshnessColor(freshness)
  return (
    <span
      className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
      style={{ backgroundColor: color }}
      title={`${freshness}`}
    />
  )
}
```

- [ ] **Step 2: 트리를 평탄화하는 유틸 (가상 스크롤용)**

```typescript
// src/renderer/src/utils/flattenTree.ts
import type { FileNode } from '../types'

export interface FlatNode {
  node: FileNode
  depth: number
}

export function flattenTree(
  nodes: FileNode[],
  expandedDirs: Set<string>,
  depth = 0
): FlatNode[] {
  const result: FlatNode[] = []
  for (const node of nodes) {
    result.push({ node, depth })
    if (node.isDir && expandedDirs.has(node.path) && node.children) {
      result.push(...flattenTree(node.children, expandedDirs, depth + 1))
    }
  }
  return result
}
```

- [ ] **Step 3: FileTree.tsx (가상 스크롤)**

```typescript
// src/renderer/src/components/FileTree/FileTree.tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import { useViewerStore } from '../../stores/viewerStore'
import { flattenTree } from '../../utils/flattenTree'
import StatusDot from './StatusDot'

export default function FileTree() {
  const { tree, expandedDirs, selectedFile, toggleDir, setSelectedFile } = useFileTreeStore()
  const { setFile, setError } = useViewerStore()
  const parentRef = useRef<HTMLDivElement>(null)

  const items = tree ? flattenTree(tree.children ?? [], expandedDirs) : []

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26
  })

  async function handleClick(node: import('../../types').FileNode) {
    if (node.isDir) {
      toggleDir(node.path)
      return
    }
    setSelectedFile(node.path)
    const { content, error } = await window.api.readFile(node.path)
    if (error || content === null) {
      setError(error ?? '파일을 읽을 수 없습니다')
      return
    }
    setFile(node.path, content)
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize() }} className="relative">
        {virtualizer.getVirtualItems().map((vi) => {
          const { node, depth } = items[vi.index]
          const isSelected = node.path === selectedFile
          return (
            <div
              key={node.path}
              style={{ transform: `translateY(${vi.start}px)`, paddingLeft: `${depth * 12 + 8}px` }}
              className={`
                absolute top-0 left-0 right-0 h-6.5 flex items-center gap-1.5 pr-2 cursor-pointer
                text-xs rounded-sm mx-1
                ${isSelected ? 'bg-surface0 text-text' : 'text-subtext0 hover:bg-surface0/40 hover:text-text'}
              `}
              onClick={() => handleClick(node)}
            >
              {node.isDir && (
                <span className="text-overlay0 w-3 text-center">
                  {expandedDirs.has(node.path) ? '▾' : '▸'}
                </span>
              )}
              <span className="truncate flex-1">
                {node.isDir ? `${node.name}` : node.name.replace(/\.md$/, '')}
              </span>
              {node.isDir && node.mdCount !== undefined && (
                <span className="text-overlay0 text-xs">{node.mdCount}</span>
              )}
              {!node.isDir && <StatusDot modifiedAt={node.modifiedAt} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: FileTreePanel.tsx**

```typescript
// src/renderer/src/components/FileTree/FileTreePanel.tsx
import { useProjectStore, activeProject } from '../../stores/projectStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import FileTree from './FileTree'

export default function FileTreePanel() {
  const project = useProjectStore(activeProject)
  const { isLoading } = useFileTreeStore()

  if (!project) return null

  return (
    <div className="flex flex-col bg-mantle border-r border-surface0 overflow-hidden" style={{ width: 220 }}>
      <div className="px-3 py-2 border-b border-surface0">
        <div className="text-xs font-semibold text-mauve uppercase tracking-wider truncate">
          {project.name}
        </div>
        <div className="text-xs text-overlay0 mt-0.5">{project.type}</div>
      </div>
      {isLoading
        ? <div className="flex-1 flex items-center justify-center text-overlay0 text-xs">로딩 중...</div>
        : <FileTree />
      }
    </div>
  )
}
```

- [ ] **Step 5: App.tsx에 FileTreePanel 추가**

```typescript
// src/renderer/src/App.tsx
import { useEffect } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'
import ActivityBar from './components/ActivityBar/ActivityBar'
import FileTreePanel from './components/FileTree/FileTreePanel'

export default function App() {
  const { setProjects, setActiveProject } = useProjectStore()
  const { setTheme } = useUiStore()

  useEffect(() => {
    window.api.getAppState().then((state) => {
      setProjects(state.projects)
      setActiveProject(state.activeProjectId)
      setTheme(state.theme)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen bg-base text-text select-none">
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <FileTreePanel />
        <div className="flex-1 flex items-center justify-center text-overlay0 text-sm">
          파일을 선택하세요
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 앱 실행 — 파일 트리 확인**

```bash
npm run dev
```

Expected: 프로젝트 선택 후 파일 트리 표시, 폴더 접기/펼치기, .md 파일 클릭 가능.

- [ ] **Step 7: 커밋**

```bash
git add src/renderer/src/components/FileTree/ src/renderer/src/utils/flattenTree.ts
git commit -m "feat: virtual-scroll FileTree panel with freshness dots"
```

---

## Task 10: Markdown 뷰어 (remark + Shiki + Mermaid)

**Files:**
- Create: `src/renderer/src/components/Viewer/MarkdownRenderer.tsx`
- Create: `src/renderer/src/components/Viewer/CodeBlock.tsx`
- Create: `src/renderer/src/components/Viewer/MermaidDiagram.tsx`
- Create: `src/renderer/src/components/Viewer/DocHeader.tsx`
- Create: `src/renderer/src/components/Viewer/DocumentViewer.tsx`
- Create: `src/renderer/src/hooks/useFileWatcher.ts`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Shiki 초기화 싱글턴**

```typescript
// src/renderer/src/utils/shiki.ts
import { createHighlighter, type Highlighter } from 'shiki'

let _highlighter: Highlighter | null = null

export async function getHighlighter(): Promise<Highlighter> {
  if (_highlighter) return _highlighter
  _highlighter = await createHighlighter({
    themes: ['catppuccin-mocha'],
    langs: ['typescript', 'javascript', 'python', 'rust', 'csharp', 'cpp',
            'yaml', 'json', 'bash', 'markdown', 'go', 'java']
  })
  return _highlighter
}
```

- [ ] **Step 2: CodeBlock.tsx**

```typescript
// src/renderer/src/components/Viewer/CodeBlock.tsx
import { useEffect, useRef, useState } from 'react'
import { getHighlighter } from '../../utils/shiki'

interface Props {
  code: string
  lang: string
}

export default function CodeBlock({ code, lang }: Props) {
  const [html, setHtml] = useState('')
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getHighlighter().then((hl) => {
      const out = hl.codeToHtml(code, { lang: lang || 'text', theme: 'catppuccin-mocha' })
      setHtml(out)
    })
  }, [code, lang])

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-surface0">
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                   text-xs bg-surface0 hover:bg-surface1 text-subtext0 px-2 py-0.5 rounded z-10"
      >
        {copied ? '✓' : 'copy'}
      </button>
      {html
        ? <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} className="overflow-x-auto text-sm" />
        : <pre className="p-4 text-sm text-text bg-mantle overflow-x-auto"><code>{code}</code></pre>
      }
    </div>
  )
}
```

- [ ] **Step 3: MermaidDiagram.tsx**

```typescript
// src/renderer/src/components/Viewer/MermaidDiagram.tsx
import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ theme: 'dark', darkMode: true, startOnLoad: false })

let idCounter = 0

interface Props { chart: string }

export default function MermaidDiagram({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useRef(`mermaid-${++idCounter}`)

  useEffect(() => {
    if (!ref.current) return
    mermaid.render(id.current, chart).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg
    }).catch((err) => {
      if (ref.current) ref.current.textContent = `Mermaid 오류: ${err.message}`
    })
  }, [chart])

  return <div ref={ref} className="my-4 flex justify-center overflow-x-auto" />
}
```

- [ ] **Step 4: MarkdownRenderer.tsx**

```typescript
// src/renderer/src/components/Viewer/MarkdownRenderer.tsx
import { useMemo, Suspense, lazy } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeReact from 'rehype-react'
import { createElement, Fragment } from 'react'
import CodeBlock from './CodeBlock'
import MermaidDiagram from './MermaidDiagram'
import { useViewerStore } from '../../stores/viewerStore'
import { extractToc } from '../../utils/toc'
import { useEffect } from 'react'

interface Props { content: string; filePath: string }

export default function MarkdownRenderer({ content, filePath }: Props) {
  const setToc = useViewerStore((s) => s.setToc)

  useEffect(() => {
    setToc(extractToc(content))
  }, [content])

  const element = useMemo(() => {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeReact, {
        createElement,
        Fragment,
        components: {
          code({ className, children, ...props }: any) {
            const lang = (className ?? '').replace('language-', '')
            const code = String(children).trim()
            if (lang === 'mermaid') return <MermaidDiagram chart={code} />
            if (lang) return <CodeBlock code={code} lang={lang} />
            return <code className="bg-surface0 rounded px-1 py-0.5 text-sm font-mono text-mauve" {...props}>{children}</code>
          },
          a({ href, children, ...props }: any) {
            const handleClick = (e: React.MouseEvent) => {
              if (href?.endsWith('.md')) {
                e.preventDefault()
                const base = filePath.substring(0, filePath.lastIndexOf('/'))
                const abs = href.startsWith('/') ? href : `${base}/${href}`
                useViewerStore.getState().navigateTo(abs)
                window.api.readFile(abs).then(({ content: c, error }) => {
                  if (c) useViewerStore.getState().setFile(abs, c)
                  else useViewerStore.getState().setError(error ?? '읽기 실패')
                })
              }
            }
            return <a href={href} onClick={handleClick} className="text-blue hover:underline" {...props}>{children}</a>
          },
          img({ src, alt, ...props }: any) {
            const base = filePath.substring(0, filePath.lastIndexOf('/'))
            const resolved = src?.startsWith('http') ? src : `file://${base}/${src}`
            return <img src={resolved} alt={alt} className="max-w-full rounded" {...props} />
          }
        }
      })
    return processor.processSync(content).result as React.ReactElement
  }, [content, filePath])

  return (
    <article className="prose prose-invert max-w-none px-8 py-6 text-text leading-relaxed">
      {element}
    </article>
  )
}
```

- [ ] **Step 5: DocHeader.tsx**

```typescript
// src/renderer/src/components/Viewer/DocHeader.tsx
import { useViewerStore } from '../../stores/viewerStore'
import { getFreshness, getFreshnessColor, formatAge } from '../../utils/freshness'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import path from 'path-browserify'

export default function DocHeader() {
  const { filePath, history, historyIndex, goBack, goForward } = useViewerStore()
  const { tree } = useFileTreeStore()

  if (!filePath) return null

  const fileName = path.basename(filePath)

  // modifiedAt을 트리에서 조회
  const modifiedAt = findModifiedAt(tree, filePath) ?? Date.now()
  const freshness = getFreshness(modifiedAt)
  const color = getFreshnessColor(freshness)

  async function navigate(getPath: () => string | null) {
    const p = getPath()
    if (!p) return
    const { content, error } = await window.api.readFile(p)
    if (content) useViewerStore.getState().setFile(p, content)
    else useViewerStore.getState().setError(error ?? '읽기 실패')
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-surface0 bg-mantle">
      <button
        disabled={historyIndex <= 0}
        onClick={() => navigate(goBack)}
        className="text-overlay0 hover:text-text disabled:opacity-30 text-sm px-1"
      >←</button>
      <button
        disabled={historyIndex >= history.length - 1}
        onClick={() => navigate(goForward)}
        className="text-overlay0 hover:text-text disabled:opacity-30 text-sm px-1"
      >→</button>
      <span className="text-sm text-text font-medium truncate flex-1">{fileName}</span>
      <span className="text-xs px-2 py-0.5 rounded-full border" style={{ color, borderColor: color }}>
        {formatAge(modifiedAt)}
      </span>
    </div>
  )
}

function findModifiedAt(node: import('../../types').FileNode | null, targetPath: string): number | undefined {
  if (!node) return undefined
  if (node.path === targetPath) return node.modifiedAt
  for (const child of node.children ?? []) {
    const found = findModifiedAt(child, targetPath)
    if (found !== undefined) return found
  }
}
```

- [ ] **Step 6: path-browserify 설치**

```bash
npm install path-browserify
npm install -D @types/path-browserify
```

`electron.vite.config.ts`의 renderer 섹션에 alias 추가:
```typescript
resolve: {
  alias: {
    '@renderer': resolve('src/renderer/src'),
    'path': 'path-browserify'
  }
}
```

- [ ] **Step 7: DocumentViewer.tsx**

```typescript
// src/renderer/src/components/Viewer/DocumentViewer.tsx
import { useViewerStore } from '../../stores/viewerStore'
import DocHeader from './DocHeader'
import MarkdownRenderer from './MarkdownRenderer'
import ErrorBoundary from '../ErrorBoundary'
import { useEffect, useRef } from 'react'

export default function DocumentViewer() {
  const { filePath, content, error, scrollPos, setScrollPos } = useViewerStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollPos
  }, [filePath])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    setScrollPos((e.target as HTMLDivElement).scrollTop)
  }

  if (!filePath) {
    return <div className="flex-1 flex items-center justify-center text-overlay0 text-sm">파일을 선택하세요</div>
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <DocHeader />
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-base">
        {error
          ? <div className="p-8 text-red text-sm">{error}</div>
          : content && (
            <ErrorBoundary fallback={<div className="p-8 text-red text-sm">렌더링 오류</div>}>
              <MarkdownRenderer content={content} filePath={filePath} />
            </ErrorBoundary>
          )
        }
      </div>
    </div>
  )
}
```

- [ ] **Step 8: ErrorBoundary.tsx**

```typescript
// src/renderer/src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}
```

- [ ] **Step 9: useFileWatcher.ts**

```typescript
// src/renderer/src/hooks/useFileWatcher.ts
import { useEffect } from 'react'
import { useViewerStore } from '../stores/viewerStore'
import { useFileTreeStore } from '../stores/fileTreeStore'
import { useProjectStore, activeProject } from '../stores/projectStore'

export function useFileWatcher() {
  const project = useProjectStore(activeProject)

  useEffect(() => {
    const unsub = window.api.onFileChanged(async ({ type, path: changedPath }) => {
      const { filePath, setFile, setError } = useViewerStore.getState()

      // 현재 열린 파일이 변경되면 리로드
      if (type === 'change' && changedPath === filePath) {
        const { content, error } = await window.api.readFile(changedPath)
        if (content) setFile(changedPath, content)
        else setError(error ?? '읽기 실패')
      }

      // 트리 갱신
      if (project) {
        const tree = await window.api.getFileTree(project.path)
        useFileTreeStore.getState().setTree(tree)
      }
    })
    return unsub
  }, [project?.path])
}
```

- [ ] **Step 10: App.tsx 최종 레이아웃**

```typescript
// src/renderer/src/App.tsx
import { useEffect } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'
import { useFileWatcher } from './hooks/useFileWatcher'
import ActivityBar from './components/ActivityBar/ActivityBar'
import FileTreePanel from './components/FileTree/FileTreePanel'
import DocumentViewer from './components/Viewer/DocumentViewer'

export default function App() {
  const { setProjects, setActiveProject } = useProjectStore()
  const { setTheme } = useUiStore()
  useFileWatcher()

  useEffect(() => {
    window.api.getAppState().then((state) => {
      setProjects(state.projects)
      setActiveProject(state.activeProjectId)
      setTheme(state.theme)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen bg-base text-text select-none">
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <FileTreePanel />
        <DocumentViewer />
        {/* TocPanel — Task 11에서 추가 */}
      </div>
    </div>
  )
}
```

- [ ] **Step 11: 앱 실행 — Markdown 렌더 확인**

```bash
npm run dev
```

Expected: .md 파일 선택 시 렌더링, 코드 블록 Shiki 하이라이트, Mermaid 다이어그램 렌더.

- [ ] **Step 12: 커밋**

```bash
git add src/renderer/src/components/Viewer/ src/renderer/src/components/ErrorBoundary.tsx \
        src/renderer/src/hooks/useFileWatcher.ts src/renderer/src/utils/shiki.ts
git commit -m "feat: Markdown viewer with Shiki highlight and Mermaid diagrams"
```

---

## Task 11: TOC 패널 & 스크롤 동기화

**Files:**
- Create: `src/renderer/src/components/TocPanel/TocPanel.tsx`
- Create: `src/renderer/src/components/TocPanel/TocTree.tsx`
- Create: `src/renderer/src/components/TocPanel/TocItem.tsx`
- Create: `src/renderer/src/hooks/useScrollSync.ts`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: TocItem.tsx**

```typescript
// src/renderer/src/components/TocPanel/TocItem.tsx
import type { TocItem as TocItemType } from '../../types'

interface Props {
  item: TocItemType
  activeId: string | null
  depth: number
  onSelect(id: string): void
}

export default function TocItem({ item, activeId, depth, onSelect }: Props) {
  const isActive = item.id === activeId
  return (
    <div>
      <button
        onClick={() => onSelect(item.id)}
        className={`
          w-full text-left text-xs py-0.5 px-2 rounded transition-colors truncate
          ${isActive ? 'text-mauve bg-surface0' : 'text-subtext0 hover:text-text hover:bg-surface0/40'}
        `}
        style={{ paddingLeft: `${depth * 10 + 8}px` }}
      >
        {item.text}
      </button>
      {item.children.map((child) => (
        <TocItem key={child.id} item={child} activeId={activeId} depth={depth + 1} onSelect={onSelect} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: TocTree.tsx**

```typescript
// src/renderer/src/components/TocPanel/TocTree.tsx
import { useViewerStore } from '../../stores/viewerStore'
import TocItem from './TocItem'

interface Props { activeId: string | null; onSelect(id: string): void }

export default function TocTree({ activeId, onSelect }: Props) {
  const toc = useViewerStore((s) => s.toc)

  if (toc.length === 0) {
    return <div className="text-xs text-overlay0 px-3 py-2">목차 없음</div>
  }

  return (
    <div className="overflow-y-auto flex-1 py-1">
      {toc.map((item) => (
        <TocItem key={item.id} item={item} activeId={activeId} depth={0} onSelect={onSelect} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: useScrollSync.ts**

```typescript
// src/renderer/src/hooks/useScrollSync.ts
import { useEffect, useRef, useState } from 'react'

export function useScrollSync(contentRef: React.RefObject<HTMLElement>) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    function onScroll() {
      const headings = Array.from(el!.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      let current: string | null = null
      for (const h of headings) {
        const rect = h.getBoundingClientRect()
        if (rect.top <= 100) current = h.id
      }
      setActiveId(current)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [contentRef.current])

  function scrollToId(id: string) {
    const el = contentRef.current
    if (!el) return
    const target = el.querySelector(`#${CSS.escape(id)}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return { activeId, scrollToId }
}
```

- [ ] **Step 4: TocPanel.tsx**

```typescript
// src/renderer/src/components/TocPanel/TocPanel.tsx
import TocTree from './TocTree'

interface Props {
  scrollRef: React.RefObject<HTMLElement>
  activeId: string | null
  onSelect(id: string): void
}

export default function TocPanel({ activeId, onSelect }: Props) {
  return (
    <div className="flex flex-col bg-mantle border-l border-surface0 overflow-hidden" style={{ width: 200 }}>
      <div className="px-3 py-2 border-b border-surface0">
        <span className="text-xs font-semibold text-mauve uppercase tracking-wider">목차</span>
      </div>
      <TocTree activeId={activeId} onSelect={onSelect} />
    </div>
  )
}
```

- [ ] **Step 5: App.tsx에 TocPanel 추가 (scrollRef 연결)**

```typescript
// src/renderer/src/App.tsx
import { useEffect, useRef } from 'react'
import { useProjectStore } from './stores/projectStore'
import { useUiStore } from './stores/uiStore'
import { useFileWatcher } from './hooks/useFileWatcher'
import { useScrollSync } from './hooks/useScrollSync'
import ActivityBar from './components/ActivityBar/ActivityBar'
import FileTreePanel from './components/FileTree/FileTreePanel'
import DocumentViewer from './components/Viewer/DocumentViewer'
import TocPanel from './components/TocPanel/TocPanel'

export default function App() {
  const { setProjects, setActiveProject } = useProjectStore()
  const { setTheme } = useUiStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const { activeId, scrollToId } = useScrollSync(scrollRef as React.RefObject<HTMLElement>)
  useFileWatcher()

  useEffect(() => {
    window.api.getAppState().then((state) => {
      setProjects(state.projects)
      setActiveProject(state.activeProjectId)
      setTheme(state.theme)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen bg-base text-text select-none">
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <FileTreePanel />
        <DocumentViewer scrollRef={scrollRef} />
        <TocPanel scrollRef={scrollRef} activeId={activeId} onSelect={scrollToId} />
      </div>
    </div>
  )
}
```

DocumentViewer.tsx에 scrollRef prop 수신 추가:
```typescript
// src/renderer/src/components/Viewer/DocumentViewer.tsx
interface Props { scrollRef: React.RefObject<HTMLDivElement> }
export default function DocumentViewer({ scrollRef }: Props) {
  // ... scrollRef를 div에 연결
  const scrollDiv = <div ref={scrollRef} ...>
```

- [ ] **Step 6: Heading에 id 부여 — rehype-slug 추가**

```bash
npm install rehype-slug
```

MarkdownRenderer.tsx의 unified 파이프라인에 추가:
```typescript
import rehypeSlug from 'rehype-slug'
// ...
.use(rehypeSlug)    // rehypeRaw 뒤에 추가
```

- [ ] **Step 7: 앱 실행 — TOC 동작 확인**

```bash
npm run dev
```

Expected: 우측 TOC 패널 표시, 스크롤 시 현재 섹션 하이라이트, 클릭 시 해당 섹션으로 이동.

- [ ] **Step 8: 커밋**

```bash
git add src/renderer/src/components/TocPanel/ src/renderer/src/hooks/useScrollSync.ts
git commit -m "feat: TOC panel with scroll synchronization"
```

---

## Task 12: 상태 지속성 — 종료 시 저장 & 시작 시 복원

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/main/index.ts`

- [ ] **Step 1: App.tsx에 종료 전 상태 저장**

```typescript
// App.tsx useEffect에 추가
useEffect(() => {
  window.api.getAppState().then(async (state) => {
    setProjects(state.projects)
    if (state.activeProjectId) {
      setActiveProject(state.activeProjectId)
      setTheme(state.theme)

      // 프로젝트 상태 복원
      const ps = state.projectStates[state.activeProjectId]
      if (ps) {
        useFileTreeStore.getState().setExpandedDirs(ps.expandedDirs)
        const proj = state.projects.find((p) => p.id === state.activeProjectId)
        if (proj) {
          const tree = await window.api.getFileTree(proj.path)
          useFileTreeStore.getState().setTree(tree)
          // 마지막 파일 복원
          if (ps.lastFile) {
            const { content, error } = await window.api.readFile(ps.lastFile)
            if (content) {
              useViewerStore.getState().setFile(ps.lastFile, content)
              useFileTreeStore.getState().setSelectedFile(ps.lastFile)
            }
          }
        }
      }
    }
  })

  // 언마운트 시 상태 저장 (앱 종료 전)
  const saveState = () => {
    const { activeProjectId } = useProjectStore.getState()
    if (!activeProjectId) return
    const { selectedFile, expandedDirs } = useFileTreeStore.getState()
    const { scrollPos } = useViewerStore.getState()
    window.api.saveProjectState({
      projectId: activeProjectId,
      lastFile: selectedFile,
      scrollPos,
      expandedDirs: Array.from(expandedDirs),
      searchHistory: []
    })
  }

  window.addEventListener('beforeunload', saveState)
  return () => window.removeEventListener('beforeunload', saveState)
}, [])
```

- [ ] **Step 2: 앱 실행 — 상태 복원 확인**

```bash
npm run dev
```

파일 선택 후 앱 종료 → 재실행 → 마지막 파일 자동 열림 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: persist and restore project state across sessions"
```

---

## Task 13: 테마 시스템 (Dark / Black)

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `tailwind.config.ts`
- Create: `src/renderer/src/components/ThemeToggle.tsx`

- [ ] **Step 1: CSS 변수 기반 테마 전환**

`src/renderer/src/index.css`에 추가:
```css
:root { color-scheme: dark; }

.theme-dark {
  --color-base: #1e1e2e;
  --color-mantle: #181825;
  --color-crust: #11111b;
  --color-surface0: #313244;
}

.theme-black {
  --color-base: #000000;
  --color-mantle: #0a0a0a;
  --color-crust: #000000;
  --color-surface0: #1a1a1a;
}
```

- [ ] **Step 2: App.tsx에 테마 클래스 적용**

```typescript
// App.tsx의 root div에 className 추가
const { theme } = useUiStore()
// ...
<div className={`theme-${theme} flex flex-col h-screen bg-base text-text select-none`}>
```

- [ ] **Step 3: ThemeToggle.tsx**

```typescript
// src/renderer/src/components/ThemeToggle.tsx
import { useUiStore } from '../stores/uiStore'

export default function ThemeToggle() {
  const { theme, setTheme } = useUiStore()

  function toggle() {
    const next = theme === 'dark' ? 'black' : 'dark'
    setTheme(next)
    window.api.setSetting('theme', next)
  }

  return (
    <button
      onClick={toggle}
      title={`현재: ${theme} 테마`}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-overlay0 hover:text-text hover:bg-surface0/50 text-sm"
    >
      {theme === 'dark' ? '◐' : '●'}
    </button>
  )
}
```

ActivityBar.tsx 하단에 ThemeToggle 추가:
```typescript
import ThemeToggle from '../ThemeToggle'
// ... SettingsIcon 위치에 추가
<ThemeToggle />
```

- [ ] **Step 4: 앱 실행 — 테마 전환 확인**

```bash
npm run dev
```

Expected: ActivityBar 하단 버튼 클릭 시 Dark ↔ Black 전환, 재시작 후 유지.

- [ ] **Step 5: 커밋**

```bash
git add src/renderer/src/components/ThemeToggle.tsx src/renderer/src/
git commit -m "feat: dark/black theme toggle with persistence"
```

---

## Task 14: 통합 테스트 & E2E 테스트

**Files:**
- Create: `tests/integration/projects-ipc.test.ts`
- Create: `tests/e2e/app.test.ts`

- [ ] **Step 1: 통합 테스트 — 프로젝트 IPC**

```typescript
// tests/integration/projects-ipc.test.ts
// Main process IPC를 직접 테스트하기 위해 better-sqlite3 in-memory DB 사용
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { CREATE_TABLES } from '../../src/main/db/schema'
import { getAllProjects, upsertProject, deleteProject } from '../../src/main/db/queries'
import { analyzeProjectType } from '../../src/main/analyzer'
import type { Project } from '../../src/renderer/src/types'

function makeDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(CREATE_TABLES)
  return db
}

describe('project management integration', () => {
  let db: Database.Database
  beforeEach(() => { db = makeDb() })
  afterEach(() => db.close())

  it('add + list + remove project lifecycle', () => {
    const p: Project = {
      id: 'test-id',
      name: 'MyProject',
      path: '/tmp/my-project',
      type: analyzeProjectType(['package.json', 'src']),
      icon: '🟢',
      lastOpened: Date.now(),
      createdAt: Date.now()
    }
    upsertProject(db, p)
    expect(getAllProjects(db)).toHaveLength(1)
    expect(getAllProjects(db)[0].type).toBe('node')
    deleteProject(db, 'test-id')
    expect(getAllProjects(db)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: E2E 테스트 (Playwright)**

```typescript
// tests/e2e/app.test.ts
import { test, expect, _electron as electron } from '@playwright/test'
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers'
import path from 'path'

test.describe('Markdown Organizer E2E', () => {
  test('app launches and shows empty state', async () => {
    const latestBuild = findLatestBuild('out')
    const appInfo = parseElectronApp(latestBuild)

    const app = await electron.launch({
      args: [appInfo.main],
      executablePath: appInfo.executable
    })

    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // 프로젝트 없을 때 기본 메시지
    await expect(page.locator('text=파일을 선택하세요')).toBeVisible()

    await app.close()
  })
})
```

- [ ] **Step 3: 모든 단위 테스트 실행**

```bash
npx vitest run
```

Expected: 모든 tests PASS.

- [ ] **Step 4: 커밋**

```bash
git add tests/
git commit -m "test: integration and E2E test coverage"
```

---

## Task 15: CI/CD — GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: CI 워크플로 작성**

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx vitest run

  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
```

- [ ] **Step 2: .gitignore 업데이트**

```bash
echo ".superpowers/" >> .gitignore
echo "out/" >> .gitignore
echo "dist/" >> .gitignore
```

- [ ] **Step 3: 커밋**

```bash
git add .github/ .gitignore
git commit -m "ci: GitHub Actions CI with 3-OS matrix build"
```

---

## 자체 검토 결과

**스펙 커버리지 확인:**

| 스펙 요구사항 | 구현 Task |
|-------------|----------|
| 프로젝트 등록/전환 | Task 8 (ActivityBar) |
| 파일 트리 탐색 | Task 9 (FileTree) |
| Markdown 렌더링 (고급) | Task 10 (MarkdownRenderer) |
| TOC 내비게이터 | Task 11 (TocPanel) |
| Mermaid 지원 | Task 10 (MermaidDiagram) |
| 코드 하이라이트 (Shiki) | Task 10 (CodeBlock) |
| 상태 저장 (SQLite) | Task 2 (DB layer) |
| 문서 상태 분석 (날짜) | Task 4 (freshness), Task 9 (StatusDot) |
| 프로젝트 유형 자동 분석 | Task 3 (analyzer) |
| Dark / Black 테마 | Task 13 (ThemeToggle) |
| 상태 지속성 (복원) | Task 12 |
| 파일 감시 (핫 리로드) | Task 5 (watcher), Task 10 (useFileWatcher) |
| 크로스플랫폼 빌드 | Task 1 (electron-builder), Task 15 (CI) |
| 내부 링크 이동 | Task 10 (MarkdownRenderer a 태그) |
| 뒤로/앞으로 탐색 | Task 10 (DocHeader), Task 7 (viewerStore) |

**모든 스펙 요구사항 커버됨.**
