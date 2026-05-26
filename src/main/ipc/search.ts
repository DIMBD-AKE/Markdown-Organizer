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

// Pure function: search within a list of file paths
export function searchInFiles(
  filePaths: string[],
  query: string,
  mode: 'string' | 'regex'
): { results: SearchResult[] } | { error: string } {
  if (!query) {
    return { results: [] }
  }

  let pattern: RegExp
  if (mode === 'regex') {
    try {
      pattern = new RegExp(query, 'gi')
    } catch {
      return { error: 'invalid_regex' }
    }
  } else {
    // Escape special regex chars for literal string search
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    pattern = new RegExp(escaped, 'gi')
  }

  const results: SearchResult[] = []

  for (const filePath of filePaths) {
    let content: string
    try {
      content = fs.readFileSync(filePath, 'utf-8')
    } catch {
      continue
    }

    const lines = content.split('\n')
    const matches: SearchMatch[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Reset lastIndex for global regex before each line
      pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.exec(line)) !== null) {
        matches.push({
          lineNumber: i + 1,
          lineText: line,
          matchStart: match.index,
          matchEnd: match.index + match[0].length,
        })
        // Avoid infinite loop on zero-length matches
        if (match[0].length === 0) {
          pattern.lastIndex++
        }
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

  // Sort by matchCount descending
  results.sort((a, b) => b.matchCount - a.matchCount)

  return { results }
}

// scope filtering is the renderer's responsibility — projectPaths must be pre-filtered by the caller
export function registerSearchHandlers(): void {
  ipcMain.handle(IPC.SEARCH_FILES, (_e, queryObj: SearchQuery) => {
    const { query, mode, projectPaths } = queryObj

    if (!query || !Array.isArray(projectPaths)) {
      return { results: [] }
    }

    const allFiles: string[] = []
    for (const projectPath of projectPaths) {
      allFiles.push(...collectMdFiles(projectPath))
    }

    return searchInFiles(allFiles, query, mode)
  })
}
