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
