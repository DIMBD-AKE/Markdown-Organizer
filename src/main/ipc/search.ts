import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { IPC } from './channels'
import type { SearchQuery, SearchResult, SearchMatch } from '../../renderer/src/types'

// Pure function: recursively collect all .md files under a directory
export function collectMdFiles(dirPath: string): string[] {
  const results: string[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(fullPath))
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
      results.push(fullPath)
    }
  }
  return results
}

// Build a search regex from query + mode. Supports wildcards (* and ?) in string mode.
function buildSearchPattern(query: string, mode: 'string' | 'regex'): RegExp | { error: string } {
  if (mode === 'regex') {
    try {
      return new RegExp(query, 'gi')
    } catch (e) {
      if (e instanceof SyntaxError) return { error: 'invalid_regex' }
      throw e
    }
  }
  // String mode: escape special regex chars except * and ?, then convert wildcards
  const escaped = query.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const withWildcards = escaped.replace(/\*/g, '.*').replace(/\?/g, '.')
  return new RegExp(withWildcards, 'gi')
}

// Core search logic on pre-loaded file contents — no I/O
export function searchInLoadedFiles(
  files: Array<{ filePath: string; content: string }>,
  query: string,
  mode: 'string' | 'regex'
): { results: SearchResult[] } | { error: string } {
  if (!query) return { results: [] }

  const patternOrError = buildSearchPattern(query, mode)
  if ('error' in patternOrError) return patternOrError
  const basePattern = patternOrError

  const results: SearchResult[] = []

  for (const { filePath, content } of files) {
    // Fresh pattern instance per file to avoid lastIndex state bleed across files
    const pattern = new RegExp(basePattern.source, basePattern.flags)
    const lines = content.split('\n')
    const matches: SearchMatch[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.exec(line)) !== null) {
        matches.push({
          lineNumber: i + 1,
          lineText: line,
          matchStart: match.index,
          matchEnd: match.index + match[0].length,
        })
        if (match[0].length === 0) pattern.lastIndex++
      }
    }

    if (matches.length > 0) {
      results.push({
        filePath,
        fileName: path.basename(filePath),
        matchCount: matches.length,
        matches: matches.slice(0, 3),
      })
    }
  }

  results.sort((a, b) => b.matchCount - a.matchCount)
  return { results }
}

// Sync wrapper for backward compatibility — used by unit tests
export function searchInFiles(
  filePaths: string[],
  query: string,
  mode: 'string' | 'regex'
): { results: SearchResult[] } | { error: string } {
  if (!query) return { results: [] }

  const files: Array<{ filePath: string; content: string }> = []
  for (const filePath of filePaths) {
    try {
      files.push({ filePath, content: fs.readFileSync(filePath, 'utf-8') })
    } catch {
      // skip unreadable files
    }
  }

  return searchInLoadedFiles(files, query, mode)
}

// scope filtering is the renderer's responsibility — projectPaths must be pre-filtered by the caller
export function registerSearchHandlers(): void {
  ipcMain.handle(IPC.SEARCH_FILES, async (_e, queryObj: SearchQuery) => {
    const { query, mode, projectPaths } = queryObj

    if (!query || !Array.isArray(projectPaths)) return { results: [] }

    const allFilePaths: string[] = []
    for (const p of projectPaths) allFilePaths.push(...collectMdFiles(p))

    // Parallel async reads — all files are fetched concurrently from the OS
    const settled = await Promise.allSettled(
      allFilePaths.map(async fp => ({ filePath: fp, content: await fs.promises.readFile(fp, 'utf-8') }))
    )
    const files = settled
      .filter((r): r is PromiseFulfilledResult<{ filePath: string; content: string }> => r.status === 'fulfilled')
      .map(r => r.value)

    return searchInLoadedFiles(files, query, mode)
  })
}
