import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { collectMdFiles, searchInFiles } from '../../src/main/ipc/search'

// Create a temporary directory with .md files for integration-style tests
let tmpDir: string

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-search-test-'))

  fs.writeFileSync(path.join(tmpDir, 'alpha.md'), [
    '# Alpha',
    'Hello world, this is a test.',
    'Another line with hello in it.',
    'No match here.',
  ].join('\n'))

  fs.writeFileSync(path.join(tmpDir, 'beta.md'), [
    '# Beta',
    'Only one occurrence of hello here.',
    'No more.',
  ].join('\n'))

  fs.writeFileSync(path.join(tmpDir, 'gamma.md'), [
    '# Gamma',
    'Nothing to find.',
  ].join('\n'))

  // A non-md file — should be ignored
  fs.writeFileSync(path.join(tmpDir, 'notes.txt'), 'hello world')

  // Sub-directory with a nested .md
  const sub = path.join(tmpDir, 'sub')
  fs.mkdirSync(sub)
  fs.writeFileSync(path.join(sub, 'nested.md'), [
    '# Nested',
    'hello from nested.',
  ].join('\n'))
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ─── collectMdFiles ───────────────────────────────────────────────────────────

describe('collectMdFiles', () => {
  it('collects all .md files recursively', () => {
    const files = collectMdFiles(tmpDir)
    const names = files.map(f => path.basename(f)).sort()
    expect(names).toContain('alpha.md')
    expect(names).toContain('beta.md')
    expect(names).toContain('gamma.md')
    expect(names).toContain('nested.md')
  })

  it('excludes non-.md files', () => {
    const files = collectMdFiles(tmpDir)
    const names = files.map(f => path.basename(f))
    expect(names).not.toContain('notes.txt')
  })

  it('returns empty array for non-existent directory', () => {
    expect(collectMdFiles('/nonexistent/path/xyz')).toEqual([])
  })
})

// ─── searchInFiles — empty query ──────────────────────────────────────────────

describe('searchInFiles — empty query', () => {
  it('returns empty results without error for empty string', () => {
    const files = collectMdFiles(tmpDir)
    const result = searchInFiles(files, '', 'string')
    expect(result).toEqual({ results: [] })
  })

  it('returns empty results for empty regex query', () => {
    const files = collectMdFiles(tmpDir)
    const result = searchInFiles(files, '', 'regex')
    expect(result).toEqual({ results: [] })
  })
})

// ─── searchInFiles — string mode ─────────────────────────────────────────────

describe('searchInFiles — string mode', () => {
  it('finds files containing the query string', () => {
    const files = collectMdFiles(tmpDir)
    const result = searchInFiles(files, 'hello', 'string')
    expect('results' in result).toBe(true)
    if (!('results' in result)) return
    const names = result.results.map(r => r.fileName).sort()
    expect(names).toContain('alpha.md')
    expect(names).toContain('beta.md')
    expect(names).toContain('nested.md')
    expect(names).not.toContain('gamma.md')
  })

  it('is case-insensitive', () => {
    const files = collectMdFiles(tmpDir)
    const lower = searchInFiles(files, 'hello', 'string')
    const upper = searchInFiles(files, 'HELLO', 'string')
    expect('results' in lower && 'results' in upper).toBe(true)
    if (!('results' in lower) || !('results' in upper)) return
    expect(lower.results.map(r => r.fileName).sort()).toEqual(
      upper.results.map(r => r.fileName).sort()
    )
  })

  it('returns correct match position (matchStart / matchEnd)', () => {
    const files = collectMdFiles(tmpDir).filter(f => path.basename(f) === 'alpha.md')
    const result = searchInFiles(files, 'Hello', 'string')
    expect('results' in result).toBe(true)
    if (!('results' in result)) return
    const alphaResult = result.results.find(r => r.fileName === 'alpha.md')
    expect(alphaResult).toBeDefined()
    const firstMatch = alphaResult!.matches[0]
    expect(firstMatch.lineNumber).toBe(2)
    expect(firstMatch.lineText).toBe('Hello world, this is a test.')
    expect(firstMatch.matchStart).toBe(0)
    expect(firstMatch.matchEnd).toBe(5)
  })

  it('counts all matches across lines', () => {
    // alpha.md has "hello" on line 2 and line 3
    const files = collectMdFiles(tmpDir).filter(f => path.basename(f) === 'alpha.md')
    const result = searchInFiles(files, 'hello', 'string')
    expect('results' in result).toBe(true)
    if (!('results' in result)) return
    expect(result.results[0].matchCount).toBe(2)
  })

  it('caps preview matches at 3', () => {
    // Create a file with 5 matches
    const manyMatchFile = path.join(tmpDir, 'many.md')
    fs.writeFileSync(manyMatchFile, Array.from({ length: 5 }, (_, i) => `line ${i + 1}: hello`).join('\n'))
    const result = searchInFiles([manyMatchFile], 'hello', 'string')
    fs.unlinkSync(manyMatchFile)
    expect('results' in result).toBe(true)
    if (!('results' in result)) return
    expect(result.results[0].matchCount).toBe(5)
    expect(result.results[0].matches).toHaveLength(3)
  })

  it('sorts results by matchCount descending', () => {
    const files = collectMdFiles(tmpDir)
    const result = searchInFiles(files, 'hello', 'string')
    expect('results' in result).toBe(true)
    if (!('results' in result)) return
    const counts = result.results.map(r => r.matchCount)
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i - 1]).toBeGreaterThanOrEqual(counts[i])
    }
  })

  it('returns no results when query matches nothing', () => {
    const files = collectMdFiles(tmpDir)
    const result = searchInFiles(files, 'xyzzy_no_match_ever', 'string')
    expect('results' in result).toBe(true)
    if (!('results' in result)) return
    expect(result.results).toHaveLength(0)
  })
})

// ─── searchInFiles — regex mode ───────────────────────────────────────────────

describe('searchInFiles — regex mode', () => {
  it('matches regex patterns', () => {
    const files = collectMdFiles(tmpDir).filter(f => path.basename(f) === 'alpha.md')
    const result = searchInFiles(files, 'hel+o', 'regex')
    expect('results' in result).toBe(true)
    if (!('results' in result)) return
    expect(result.results).toHaveLength(1)
    expect(result.results[0].matchCount).toBe(2)
  })

  it('returns error for invalid regex', () => {
    const files = collectMdFiles(tmpDir)
    const result = searchInFiles(files, '[invalid(', 'regex')
    expect('error' in result).toBe(true)
    if (!('error' in result)) return
    expect(result.error).toBe('invalid_regex')
  })

  it('is case-insensitive via gi flags', () => {
    const files = collectMdFiles(tmpDir).filter(f => path.basename(f) === 'alpha.md')
    const result = searchInFiles(files, 'HELLO', 'regex')
    expect('results' in result).toBe(true)
    if (!('results' in result)) return
    expect(result.results).toHaveLength(1)
  })

  it('handles anchored patterns', () => {
    // Line starting with "# " — all .md files have a heading on line 1
    const files = collectMdFiles(tmpDir)
    const result = searchInFiles(files, '^# ', 'regex')
    expect('results' in result).toBe(true)
    if (!('results' in result)) return
    // Every .md file has a heading
    expect(result.results.length).toBeGreaterThan(0)
  })
})
