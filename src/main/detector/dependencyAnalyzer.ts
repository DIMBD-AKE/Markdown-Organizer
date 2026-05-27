import fs from 'fs'
import path from 'path'

export interface ParsedDependencies {
  all: string[]
  raw: Record<string, string>
  fields: Record<string, unknown>
}

export async function parsePackageJson(rootPath: string): Promise<ParsedDependencies | null> {
  try {
    const raw = JSON.parse(await fs.promises.readFile(path.join(rootPath, 'package.json'), 'utf-8'))
    const deps = { ...(raw.dependencies ?? {}), ...(raw.devDependencies ?? {}) }
    return { all: Object.keys(deps), raw: deps, fields: raw }
  } catch {
    return null
  }
}

export async function parseRequirementsTxt(rootPath: string): Promise<string[] | null> {
  try {
    const text = await fs.promises.readFile(path.join(rootPath, 'requirements.txt'), 'utf-8')
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.replace(/[>=<!~^].*/g, '').trim().toLowerCase())
      .filter(Boolean)
  } catch {
    return null
  }
}

export async function parsePyprojectToml(rootPath: string): Promise<string[] | null> {
  try {
    const text = await fs.promises.readFile(path.join(rootPath, 'pyproject.toml'), 'utf-8')
    const deps: string[] = []
    let inDepsSection = false
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.match(/^\[(tool\.poetry\.dependencies|project\.dependencies|project)\]/)) {
        inDepsSection = true
        continue
      }
      if (trimmed.startsWith('[') && inDepsSection) {
        inDepsSection = false
      }
      if (inDepsSection) {
        const match = trimmed.match(/^"?([a-zA-Z0-9_-]+)/)
        if (match) deps.push(match[1].toLowerCase())
      }
    }
    return deps.length ? deps : null
  } catch {
    return null
  }
}

export async function parseCargoToml(rootPath: string): Promise<string[] | null> {
  try {
    const text = await fs.promises.readFile(path.join(rootPath, 'Cargo.toml'), 'utf-8')
    const deps: string[] = []
    let inDepsSection = false
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (trimmed === '[dependencies]' || trimmed === '[dev-dependencies]') {
        inDepsSection = true
        continue
      }
      if (trimmed.startsWith('[') && inDepsSection) {
        inDepsSection = false
      }
      if (inDepsSection) {
        const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=/)
        if (match) deps.push(match[1].toLowerCase())
      }
    }
    return deps.length ? deps : null
  } catch {
    return null
  }
}

export async function parseCsproj(rootPath: string): Promise<string[] | null> {
  try {
    const entries = await fs.promises.readdir(rootPath)
    const csprojFile = entries.find((f) => f.endsWith('.csproj'))
    if (!csprojFile) return null
    const text = await fs.promises.readFile(path.join(rootPath, csprojFile), 'utf-8')
    const matches = [...text.matchAll(/PackageReference\s+Include="([^"]+)"/g)]
    return matches.map((m) => m[1].toLowerCase())
  } catch {
    return null
  }
}
