import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { analyzeDirectory } from '../../src/main/detector'

let tmpDir: string

function mkDir(rel: string) {
  fs.mkdirSync(path.join(tmpDir, rel), { recursive: true })
}

function mkFile(rel: string, content = '') {
  const full = path.join(tmpDir, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

function makeProject(name: string, setup: (dir: string) => void): string {
  const dir = path.join(tmpDir, name)
  fs.mkdirSync(dir, { recursive: true })
  setup(dir)
  return dir
}

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-detector-test-'))
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ─── Unity ────────────────────────────────────────────────────────────────────

describe('Unity detection', () => {
  it('detects Unity project — confidence >= 85', async () => {
    const dir = makeProject('unity', (d) => {
      fs.mkdirSync(path.join(d, 'ProjectSettings'))
      fs.mkdirSync(path.join(d, 'Assets'))
      fs.mkdirSync(path.join(d, 'Packages'))
      fs.writeFileSync(path.join(d, 'Packages', 'manifest.json'), '{}')
    })
    const result = await analyzeDirectory(dir)
    expect(result.primaryType).toBe('unity')
    expect(result.confidence).toBeGreaterThanOrEqual(85)
    expect(result.frameworks).toContain('Unity')
  })
})

// ─── Electron ─────────────────────────────────────────────────────────────────

describe('Electron detection', () => {
  it('detects Electron via dependency + main field', async () => {
    const dir = makeProject('electron', (d) => {
      fs.writeFileSync(
        path.join(d, 'package.json'),
        JSON.stringify({ main: 'dist/main.js', devDependencies: { electron: '^28.0.0' } })
      )
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Electron')
    expect(result.primaryType).toBe('node')
  })
})

// ─── React ────────────────────────────────────────────────────────────────────

describe('React detection', () => {
  it('detects React via dependency', async () => {
    const dir = makeProject('react', (d) => {
      fs.writeFileSync(
        path.join(d, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' } })
      )
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('React')
  })
})

// ─── Electron + React ─────────────────────────────────────────────────────────

describe('Electron + React combined', () => {
  it('detects both frameworks', async () => {
    const dir = makeProject('electron-react', (d) => {
      fs.writeFileSync(
        path.join(d, 'package.json'),
        JSON.stringify({
          main: 'dist/main.js',
          dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
          devDependencies: { electron: '^28.0.0', 'electron-builder': '^24.0.0' },
        })
      )
      fs.mkdirSync(path.join(d, 'src'))
      fs.writeFileSync(path.join(d, 'src', 'App.tsx'), '')
      fs.writeFileSync(path.join(d, 'src', 'preload.ts'), '')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Electron')
    expect(result.frameworks).toContain('React')
    expect(result.primaryType).toBe('node')
  })
})

// ─── Node.js fallback ─────────────────────────────────────────────────────────

describe('Node.js fallback', () => {
  it('detects Node.js with only package.json — low confidence + LowConfidence warning', async () => {
    const dir = makeProject('node-only', (d) => {
      fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'test' }))
    })
    const result = await analyzeDirectory(dir)
    expect(result.primaryType).toBe('node')
    expect(result.confidence).toBeLessThan(50)
    expect(result.warnings.some((w) => w.code === 'LowConfidence')).toBe(true)
  })
})

// ─── Flask ────────────────────────────────────────────────────────────────────

describe('Flask detection', () => {
  it('detects Flask via requirements.txt', async () => {
    const dir = makeProject('flask', (d) => {
      fs.writeFileSync(path.join(d, 'requirements.txt'), 'flask>=2.0\nrequests\n')
      fs.writeFileSync(path.join(d, 'app.py'), '')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Flask')
    expect(result.primaryType).toBe('python')
  })
})

// ─── Django ───────────────────────────────────────────────────────────────────

describe('Django detection', () => {
  it('detects Django via manage.py + requirements.txt', async () => {
    const dir = makeProject('django', (d) => {
      fs.writeFileSync(path.join(d, 'manage.py'), '')
      fs.writeFileSync(path.join(d, 'requirements.txt'), 'Django>=4.0\n')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Django')
    expect(result.primaryType).toBe('python')
  })
})

// ─── Docker ───────────────────────────────────────────────────────────────────

describe('Docker detection', () => {
  it('detects Docker via Dockerfile + docker-compose.yml', async () => {
    const dir = makeProject('docker', (d) => {
      fs.writeFileSync(path.join(d, 'Dockerfile'), 'FROM node:20\n')
      fs.writeFileSync(path.join(d, 'docker-compose.yml'), 'version: "3"\n')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Docker')
  })
})

// ─── Unknown ──────────────────────────────────────────────────────────────────

describe('Unknown project', () => {
  it('returns unknown for empty directory', async () => {
    const dir = makeProject('empty', () => {})
    const result = await analyzeDirectory(dir)
    expect(result.primaryType).toBe('unknown')
    expect(result.confidence).toBe(0)
    expect(result.frameworks).toHaveLength(0)
  })
})

// ─── Package managers ─────────────────────────────────────────────────────────

describe('Package manager detection', () => {
  it('detects pnpm via pnpm-lock.yaml', async () => {
    const dir = makeProject('pnpm-project', (d) => {
      fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'test' }))
      fs.writeFileSync(path.join(d, 'pnpm-lock.yaml'), '')
    })
    const result = await analyzeDirectory(dir)
    expect(result.packageManagers).toContain('pnpm')
  })

  it('detects npm via package-lock.json', async () => {
    const dir = makeProject('npm-project', (d) => {
      fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'test' }))
      fs.writeFileSync(path.join(d, 'package-lock.json'), '{}')
    })
    const result = await analyzeDirectory(dir)
    expect(result.packageManagers).toContain('npm')
  })
})

// ─── Build systems ────────────────────────────────────────────────────────────

describe('Build system detection', () => {
  it('detects Vite via vite.config.ts', async () => {
    const dir = makeProject('vite-project', (d) => {
      fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'test' }))
      fs.writeFileSync(path.join(d, 'vite.config.ts'), '')
    })
    const result = await analyzeDirectory(dir)
    expect(result.buildSystems).toContain('Vite')
  })

  it('detects Webpack via webpack.config.js', async () => {
    const dir = makeProject('webpack-project', (d) => {
      fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'test' }))
      fs.writeFileSync(path.join(d, 'webpack.config.js'), '')
    })
    const result = await analyzeDirectory(dir)
    expect(result.buildSystems).toContain('Webpack')
  })
})

// ─── Low confidence warning ───────────────────────────────────────────────────

describe('Confidence warnings', () => {
  it('emits LowConfidence when score < 50', async () => {
    const dir = makeProject('low-confidence', (d) => {
      fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'test' }))
    })
    const result = await analyzeDirectory(dir)
    expect(result.warnings.some((w) => w.code === 'LowConfidence')).toBe(true)
  })

  it('no LowConfidence warning for clear Unity project', async () => {
    const dir = makeProject('unity-clear', (d) => {
      fs.mkdirSync(path.join(d, 'ProjectSettings'))
      fs.mkdirSync(path.join(d, 'Assets'))
      fs.mkdirSync(path.join(d, 'Packages'))
      fs.writeFileSync(path.join(d, 'Packages', 'manifest.json'), '{}')
    })
    const result = await analyzeDirectory(dir)
    expect(result.warnings.some((w) => w.code === 'LowConfidence')).toBe(false)
  })
})

// ─── Rust ─────────────────────────────────────────────────────────────────────

describe('Rust detection', () => {
  it('detects Rust via Cargo.toml', async () => {
    const dir = makeProject('rust', (d) => {
      fs.writeFileSync(path.join(d, 'Cargo.toml'), '[package]\nname = "myapp"\n')
    })
    const result = await analyzeDirectory(dir)
    expect(result.primaryType).toBe('rust')
    expect(result.frameworks).toContain('Rust')
  })
})

// ─── Tauri ────────────────────────────────────────────────────────────────────

describe('Tauri detection', () => {
  it('detects Tauri via src-tauri/ + tauri.conf.json', async () => {
    const dir = makeProject('tauri', (d) => {
      fs.mkdirSync(path.join(d, 'src-tauri'))
      fs.writeFileSync(path.join(d, 'src-tauri', 'tauri.conf.json'), '{}')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Tauri')
    expect(result.primaryType).toBe('rust')
  })
})

// ─── Godot ────────────────────────────────────────────────────────────────────

describe('Godot detection', () => {
  it('detects Godot via project.godot', async () => {
    const dir = makeProject('godot', (d) => {
      fs.writeFileSync(path.join(d, 'project.godot'), '[gd_resource]\n')
      fs.writeFileSync(path.join(d, 'main.tscn'), '')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Godot')
    expect(result.confidence).toBeGreaterThanOrEqual(80)
  })
})

// ─── Go ───────────────────────────────────────────────────────────────────────

describe('Go detection', () => {
  it('detects Go via go.mod', async () => {
    const dir = makeProject('golang', (d) => {
      fs.writeFileSync(path.join(d, 'go.mod'), 'module github.com/user/app\n\ngo 1.21\n')
      fs.writeFileSync(path.join(d, 'main.go'), 'package main\n')
    })
    const result = await analyzeDirectory(dir)
    expect(result.primaryType).toBe('go')
    expect(result.frameworks).toContain('Go')
  })
})

// ─── Kubernetes ───────────────────────────────────────────────────────────────

describe('Kubernetes detection', () => {
  it('detects Kubernetes via k8s/ dir + deployment.yaml', async () => {
    const dir = makeProject('kubernetes', (d) => {
      fs.mkdirSync(path.join(d, 'k8s'))
      fs.writeFileSync(path.join(d, 'deployment.yaml'), 'apiVersion: apps/v1\nkind: Deployment\n')
      fs.writeFileSync(path.join(d, 'service.yaml'), '')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Kubernetes')
  })
})

// ─── Terraform ────────────────────────────────────────────────────────────────

describe('Terraform detection', () => {
  it('detects Terraform via *.tf files', async () => {
    const dir = makeProject('terraform', (d) => {
      fs.writeFileSync(path.join(d, 'main.tf'), 'terraform {\n  required_version = ">= 1.0"\n}\n')
      fs.writeFileSync(path.join(d, 'variables.tf'), '')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Terraform')
  })
})

// ─── GitHub Actions ───────────────────────────────────────────────────────────

describe('GitHub Actions detection', () => {
  it('detects GitHub Actions via .github/workflows/', async () => {
    const dir = makeProject('gh-actions', (d) => {
      fs.mkdirSync(path.join(d, '.github', 'workflows'), { recursive: true })
      fs.writeFileSync(path.join(d, '.github', 'workflows', 'ci.yml'), '')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('GitHub Actions')
  })
})

// ─── Obsidian ─────────────────────────────────────────────────────────────────

describe('Obsidian vault detection', () => {
  it('detects Obsidian via .obsidian/', async () => {
    const dir = makeProject('obsidian', (d) => {
      fs.mkdirSync(path.join(d, '.obsidian'))
      fs.writeFileSync(path.join(d, 'README.md'), '# Notes\n')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Obsidian Vault')
    expect(result.primaryType).toBe('docs')
  })
})

// ─── PHP / Laravel ────────────────────────────────────────────────────────────

describe('Laravel detection', () => {
  it('detects Laravel via artisan + app/Http/', async () => {
    const dir = makeProject('laravel', (d) => {
      fs.writeFileSync(path.join(d, 'artisan'), '#!/usr/bin/env php\n')
      fs.writeFileSync(path.join(d, 'composer.json'), '{}')
      fs.mkdirSync(path.join(d, 'app', 'Http'), { recursive: true })
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Laravel')
    expect(result.primaryType).toBe('php')
  })
})

// ─── Jupyter ──────────────────────────────────────────────────────────────────

describe('Jupyter detection', () => {
  it('detects Jupyter via *.ipynb', async () => {
    const dir = makeProject('jupyter', (d) => {
      fs.writeFileSync(path.join(d, 'analysis.ipynb'), '{"cells": []}')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('Jupyter')
    expect(result.primaryType).toBe('ai-research')
  })
})

// ─── SvelteKit ────────────────────────────────────────────────────────────────

describe('SvelteKit detection', () => {
  it('detects SvelteKit via @sveltejs/kit dependency', async () => {
    const dir = makeProject('sveltekit', (d) => {
      fs.writeFileSync(
        path.join(d, 'package.json'),
        JSON.stringify({ devDependencies: { '@sveltejs/kit': '^2.0.0', svelte: '^4.0.0' } })
      )
      fs.writeFileSync(path.join(d, 'svelte.config.js'), '')
    })
    const result = await analyzeDirectory(dir)
    expect(result.frameworks).toContain('SvelteKit')
  })
})
