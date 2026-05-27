import fs from 'fs'
import path from 'path'
import type { DetectionRule, RuleCheck } from './rules'
import type { ParsedDependencies } from './dependencyAnalyzer'
import type { ProjectEvidence } from '../../renderer/src/types'

export async function evaluateRules(
  rootPath: string,
  rootEntries: string[],
  subEntries: string[],
  deps: ParsedDependencies | null,
  pythonDeps: string[] | null,
  cargoDeps: string[] | null,
  csprojDeps: string[] | null,
  rules: DetectionRule[]
): Promise<Array<{ rule: DetectionRule; score: number; evidence: ProjectEvidence[] }>> {
  const results = await Promise.all(
    rules.map(async (rule) => {
      let score = 0
      const evidence: ProjectEvidence[] = []
      for (const check of rule.checks) {
        const matched = await evalCheck(check, rootPath, rootEntries, subEntries, deps, pythonDeps, cargoDeps, csprojDeps)
        if (matched !== null) {
          score += check.score
          evidence.push({ rule: `${rule.id}:${check.type}`, path: matched, score: check.score })
        }
      }
      return { rule, score, evidence }
    })
  )
  return results.filter((r) => r.score > 0)
}

async function evalCheck(
  check: RuleCheck,
  rootPath: string,
  rootEntries: string[],
  subEntries: string[],
  deps: ParsedDependencies | null,
  pythonDeps: string[] | null,
  cargoDeps: string[] | null,
  csprojDeps: string[] | null
): Promise<string | null> {
  switch (check.type) {
    case 'pathExists': {
      if (!check.path.includes('/') && rootEntries.includes(check.path)) return check.path
      try {
        await fs.promises.access(path.join(rootPath, check.path))
        return check.path
      } catch { return null }
    }

    case 'fileExists': {
      try {
        const full = path.join(rootPath, check.path)
        const stat = await fs.promises.stat(full)
        return stat.isFile() ? check.path : null
      } catch { return null }
    }

    case 'globExists': {
      const pat = check.pattern
      const all = [...rootEntries, ...subEntries]

      if (pat.startsWith('*.')) {
        const ext = pat.slice(1)
        return all.find((e) => e.endsWith(ext)) ?? null
      }

      if (pat.endsWith('.*')) {
        const prefix = pat.slice(0, -1)
        return rootEntries.find((e) => e.startsWith(prefix)) ?? null
      }

      const re = new RegExp(
        '^' + pat.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      )
      return rootEntries.find((e) => re.test(e)) ?? null
    }

    case 'hasDependency':
      return deps?.all.includes(check.name) ? 'package.json' : null

    case 'hasPythonDep':
      return pythonDeps?.some((d) => d === check.name.toLowerCase()) ? 'requirements.txt' : null

    case 'hasCargoDep':
      return cargoDeps?.some((d) => d === check.name.toLowerCase()) ? 'Cargo.toml' : null

    case 'hasCsprojDep':
      return csprojDeps?.some((d) => d === check.name.toLowerCase()) ? '*.csproj' : null

    case 'packageJsonField':
      return deps?.fields[check.field] !== undefined ? 'package.json' : null
  }
}
