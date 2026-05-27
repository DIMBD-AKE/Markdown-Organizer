import fs from 'fs'
import path from 'path'
import { RULES } from './rules'
import {
  parsePackageJson,
  parseRequirementsTxt,
  parsePyprojectToml,
  parseCargoToml,
  parseCsproj,
} from './dependencyAnalyzer'
import { evaluateRules } from './ruleEngine'
import { resolve } from './confidenceResolver'
import type { DetectionResult } from '../../renderer/src/types'

// Shallow-scan these common source dirs to improve glob detection
const SHALLOW_SCAN_DIRS = ['src', 'lib', 'app', 'cmd', 'internal']

export function analyzeDirectory(dirPath: string): DetectionResult {
  let rootEntries: string[] = []
  try {
    rootEntries = fs.readdirSync(dirPath)
  } catch {
    return fallbackResult()
  }

  // Collect shallow entries from common source subdirs
  const subEntries: string[] = []
  for (const dir of SHALLOW_SCAN_DIRS) {
    if (rootEntries.includes(dir)) {
      try {
        fs.readdirSync(path.join(dirPath, dir)).forEach((e) => subEntries.push(`${dir}/${e}`))
      } catch { /* empty */ }
    }
  }

  const deps = parsePackageJson(dirPath)
  const pythonDeps = [
    ...(parseRequirementsTxt(dirPath) ?? []),
    ...(parsePyprojectToml(dirPath) ?? []),
  ]
  const cargoDeps = parseCargoToml(dirPath)
  const csprojDeps = parseCsproj(dirPath)

  const ruleScores = evaluateRules(
    dirPath,
    rootEntries,
    subEntries,
    deps,
    pythonDeps.length ? pythonDeps : null,
    cargoDeps,
    csprojDeps,
    RULES
  )

  return resolve(ruleScores, rootEntries)
}

function fallbackResult(): DetectionResult {
  return {
    primaryType: 'unknown',
    icon: '📁',
    confidence: 0,
    frameworks: [],
    languages: [],
    buildSystems: [],
    packageManagers: [],
    platforms: [],
    runtimes: [],
    evidence: [],
    warnings: [],
  }
}
