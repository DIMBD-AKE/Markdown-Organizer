import fs from 'fs'
import path from 'path'
import type { FileNode } from '../renderer/src/types'

// Directories that are never useful in a markdown organizer and can be huge.
// Scanning node_modules recursively can produce 100k+ entries and hang the IPC.
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn',
  'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit',
  '__pycache__', '.pytest_cache', '.mypy_cache',
  '.turbo', 'coverage', '.nyc_output',
  '.DS_Store', 'Thumbs.db'
])

export function buildFileTree(dirPath: string): FileNode {
  const stat = fs.statSync(dirPath)
  const name = path.basename(dirPath)

  if (!stat.isDirectory()) {
    return { name, path: dirPath, isDir: false, modifiedAt: stat.mtimeMs }
  }

  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch { /* skip dirs without permission */ }

  // Skip hidden files/dirs and well-known noise directories
  const visible = entries.filter(
    (e) => !e.name.startsWith('.') && !EXCLUDED_DIRS.has(e.name)
  )
  const dirs = visible.filter((e) => e.isDirectory())
  const files = visible.filter((e) => !e.isDirectory() && e.name.endsWith('.md'))

  const children: FileNode[] = [
    ...dirs.map((d) => buildFileTree(path.join(dirPath, d.name))),
    ...files.map((f) => {
      const fp = path.join(dirPath, f.name)
      try {
        const s = fs.statSync(fp)
        return { name: f.name, path: fp, isDir: false, modifiedAt: s.mtimeMs }
      } catch {
        return { name: f.name, path: fp, isDir: false, modifiedAt: 0 }
      }
    })
  ]

  const mdCount = countMd(children)
  return { name, path: dirPath, isDir: true, children, modifiedAt: stat.mtimeMs, mdCount }
}

function countMd(nodes: FileNode[]): number {
  return nodes.reduce((acc, n) => {
    if (!n.isDir) return acc + 1
    return acc + (n.mdCount ?? 0)
  }, 0)
}
