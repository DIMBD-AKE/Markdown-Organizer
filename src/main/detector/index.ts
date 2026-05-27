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

const SHALLOW_SCAN_DIRS = ['src', 'lib', 'app', 'cmd', 'internal']

export async function analyzeDirectory(dirPath: string): Promise<DetectionResult> {
  let rootEntries: string[] = []
  try {
    rootEntries = await fs.promises.readdir(dirPath)
  } catch {
    return fallbackResult()
  }

  const subEntries: string[] = []
  await Promise.all(
    SHALLOW_SCAN_DIRS
      .filter((dir) => rootEntries.includes(dir))
      .map(async (dir) => {
        try {
          const entries = await fs.promises.readdir(path.join(dirPath, dir))
          entries.forEach((e) => subEntries.push(`${dir}/${e}`))
        } catch { /* skip */ }
      })
  )

  const [deps, reqDeps, pyprojectDeps, cargoDeps, csprojDeps] = await Promise.all([
    parsePackageJson(dirPath),
    parseRequirementsTxt(dirPath),
    parsePyprojectToml(dirPath),
    parseCargoToml(dirPath),
    parseCsproj(dirPath),
  ])

  const pythonDeps = [
    ...(reqDeps ?? []),
    ...(pyprojectDeps ?? []),
  ]

  const ruleScores = await evaluateRules(
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
