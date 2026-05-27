import fs from 'fs'
import path from 'path'
import type { FileNode } from '../renderer/src/types'

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn',
  'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit',
  '__pycache__', '.pytest_cache', '.mypy_cache',
  '.turbo', 'coverage', '.nyc_output',
  '.DS_Store', 'Thumbs.db'
])

const UNITY_EXCLUDED = new Set(['Library', 'Temp', 'Logs', 'obj', 'Build', 'Builds'])

async function isUnityProject(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.promises.readdir(dirPath)
    return entries.includes('Assets') && entries.includes('ProjectSettings')
  } catch {
    return false
  }
}

async function buildFileTreeInner(
  dirPath: string,
  extraExcluded: Set<string>
): Promise<FileNode> {
  let stat: fs.Stats
  try {
    stat = await fs.promises.stat(dirPath)
  } catch {
    return { name: path.basename(dirPath), path: dirPath, isDir: false, modifiedAt: 0 }
  }

  const name = path.basename(dirPath)

  if (!stat.isDirectory()) {
    return { name, path: dirPath, isDir: false, modifiedAt: stat.mtimeMs }
  }

  let entries: fs.Dirent[] = []
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  } catch { /* skip dirs without read permission */ }

  const visible = entries.filter(
    (e) => !e.name.startsWith('.') && !EXCLUDED_DIRS.has(e.name) && !extraExcluded.has(e.name)
  )
  const dirs = visible.filter((e) => e.isDirectory())
  const files = visible.filter((e) => !e.isDirectory() && e.name.endsWith('.md'))

  const [dirChildren, fileChildren] = await Promise.all([
    Promise.all(dirs.map((d) => buildFileTreeInner(path.join(dirPath, d.name), extraExcluded))),
    Promise.all(
      files.map(async (f) => {
        const fp = path.join(dirPath, f.name)
        try {
          const s = await fs.promises.stat(fp)
          return { name: f.name, path: fp, isDir: false, modifiedAt: s.mtimeMs }
        } catch {
          return { name: f.name, path: fp, isDir: false, modifiedAt: 0 }
        }
      })
    ),
  ])

  const children: FileNode[] = [
    ...dirChildren.filter((child) => !child.isDir || (child.mdCount ?? 0) > 0),
    ...fileChildren,
  ]

  const mdCount = countMd(children)
  return { name, path: dirPath, isDir: true, children, modifiedAt: stat.mtimeMs, mdCount }
}

export async function buildFileTree(dirPath: string): Promise<FileNode> {
  const extraExcluded = (await isUnityProject(dirPath)) ? UNITY_EXCLUDED : new Set<string>()
  return buildFileTreeInner(dirPath, extraExcluded)
}

function countMd(nodes: FileNode[]): number {
  return nodes.reduce((acc, n) => {
    if (!n.isDir) return acc + 1
    return acc + (n.mdCount ?? 0)
  }, 0)
}
