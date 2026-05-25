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
