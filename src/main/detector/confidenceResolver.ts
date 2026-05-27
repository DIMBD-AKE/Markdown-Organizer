import type { DetectionRule } from './rules'
import type { DetectionResult, ProjectEvidence, ProjectWarning, ProjectType } from '../../renderer/src/types'

export function resolve(
  ruleScores: Array<{ rule: DetectionRule; score: number; evidence: ProjectEvidence[] }>,
  rootEntries: string[]
): DetectionResult {
  const sorted = [...ruleScores].sort((a, b) => b.score - a.score)
  const top = sorted[0]

  const primaryType = getPrimaryType(top?.rule)
  const icon = top?.rule.icon ?? '📁'
  const confidence = Math.min(100, top?.score ?? 0)

  const qualifying = sorted.filter((r) => r.score >= 30)
  const frameworks = qualifying.map((r) => r.rule.displayName)
  const languages = [...new Set(qualifying.flatMap((r) => (r.rule.language ? [r.rule.language] : [])))]
  const platforms = [...new Set(qualifying.flatMap((r) => r.rule.platform))]
  const runtimes = [...new Set(qualifying.flatMap((r) => (r.rule.runtime ? [r.rule.runtime] : [])))]

  const packageManagers = detectPackageManagers(rootEntries)
  const buildSystems = detectBuildSystems(rootEntries)

  const warnings: ProjectWarning[] = []
  if (ruleScores.length > 0 && confidence < 50) {
    warnings.push({ code: 'LowConfidence', message: '프로젝트 유형을 명확히 판별하기 어렵습니다.' })
  }

  return {
    primaryType,
    icon,
    confidence,
    frameworks,
    languages,
    buildSystems,
    packageManagers,
    platforms,
    runtimes,
    evidence: sorted.flatMap((r) => r.evidence),
    warnings,
  }
}

export function getPrimaryType(rule: DetectionRule | undefined): ProjectType {
  if (!rule) return 'unknown'
  if (rule.primaryType) return rule.primaryType
  switch (rule.category) {
    case 'GameEngine': return 'unity'
    case 'Frontend':
    case 'Backend':
    case 'Desktop':
    case 'Mobile':
    case 'Monorepo':
    case 'Language': return 'node'
    case 'AI': return 'ai-research'
    case 'Docs': return 'docs'
    default: return 'unknown'
  }
}

function detectPackageManagers(rootEntries: string[]): string[] {
  const result: string[] = []
  if (rootEntries.includes('pnpm-lock.yaml')) result.push('pnpm')
  if (rootEntries.includes('yarn.lock')) result.push('yarn')
  if (rootEntries.some((f) => f === 'bun.lockb' || f === 'bun.lock')) result.push('bun')
  if (rootEntries.includes('package-lock.json')) result.push('npm')
  if (rootEntries.includes('Cargo.lock')) result.push('cargo')
  return result
}

function detectBuildSystems(rootEntries: string[]): string[] {
  const result: string[] = []
  if (rootEntries.some((f) => f.startsWith('vite.config.'))) result.push('Vite')
  if (rootEntries.some((f) => f.startsWith('webpack.config.'))) result.push('Webpack')
  if (rootEntries.includes('turbo.json')) result.push('Turbopack')
  if (rootEntries.includes('pom.xml')) result.push('Maven')
  if (rootEntries.some((f) => f === 'build.gradle' || f === 'build.gradle.kts')) result.push('Gradle')
  if (rootEntries.some((f) => f.endsWith('.sln'))) result.push('MSBuild')
  if (rootEntries.includes('CMakeLists.txt')) result.push('CMake')
  return result
}
