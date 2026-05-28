// Shared filter constants for file tree walking and file watching.
// Keeping these in one place prevents drift between buildFileTree, the
// streaming walker, and the chokidar watcher — drift causes events to fire
// for files the tree doesn't surface (or vice versa).
import fs from 'fs'

export const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn',
  'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit',
  '__pycache__', '.pytest_cache', '.mypy_cache',
  '.turbo', 'coverage', '.nyc_output',
  '.DS_Store', 'Thumbs.db'
])

export const UNITY_EXCLUDED = new Set(['Library', 'Temp', 'Logs', 'obj', 'Build', 'Builds'])

/** Synchronous Unity detection — for use at watcher startup (no async ctx). */
export function isUnityProjectSync(rootPath: string): boolean {
  try {
    const entries = fs.readdirSync(rootPath)
    return entries.includes('Assets') && entries.includes('ProjectSettings')
  } catch {
    return false
  }
}
