import fs from 'fs'
import path from 'path'
import { Semaphore, withSemaphore } from './concurrency'
import { EXCLUDED_DIRS, UNITY_EXCLUDED } from './projectFilters'
import type { FileNode } from '../renderer/src/types'

// Global I/O concurrency cap — Windows Defender + chokidar share filesystem queue.
// 8 picked empirically: high enough for HDD/SSD throughput, low enough to avoid
// thrashing under per-file AV scan on Windows. Applies to all stat/readdir.
const FS_CONCURRENCY = 8

async function isUnityProject(dirPath: string, sem: Semaphore): Promise<boolean> {
  try {
    const entries = await withSemaphore(sem, () => fs.promises.readdir(dirPath))
    return entries.includes('Assets') && entries.includes('ProjectSettings')
  } catch {
    return false
  }
}

async function buildFileTreeInner(
  dirPath: string,
  extraExcluded: Set<string>,
  sem: Semaphore
): Promise<FileNode> {
  let stat: fs.Stats
  try {
    stat = await withSemaphore(sem, () => fs.promises.stat(dirPath))
  } catch {
    return { name: path.basename(dirPath), path: dirPath, isDir: false, modifiedAt: 0 }
  }

  const name = path.basename(dirPath)

  if (!stat.isDirectory()) {
    return { name, path: dirPath, isDir: false, modifiedAt: stat.mtimeMs }
  }

  let entries: fs.Dirent[] = []
  try {
    entries = await withSemaphore(sem, () => fs.promises.readdir(dirPath, { withFileTypes: true }))
  } catch { /* skip dirs without read permission */ }

  const visible = entries.filter(
    (e) => !e.name.startsWith('.') && !EXCLUDED_DIRS.has(e.name) && !extraExcluded.has(e.name)
  )
  const dirs = visible.filter((e) => e.isDirectory())
  const files = visible.filter((e) => !e.isDirectory() && e.name.endsWith('.md'))

  const [dirChildren, fileChildren] = await Promise.all([
    Promise.all(dirs.map((d) => buildFileTreeInner(path.join(dirPath, d.name), extraExcluded, sem))),
    Promise.all(
      files.map(async (f) => {
        const fp = path.join(dirPath, f.name)
        try {
          const s = await withSemaphore(sem, () => fs.promises.stat(fp))
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
  const sem = new Semaphore(FS_CONCURRENCY)
  const extraExcluded = (await isUnityProject(dirPath, sem)) ? UNITY_EXCLUDED : new Set<string>()
  return buildFileTreeInner(dirPath, extraExcluded, sem)
}

function countMd(nodes: FileNode[]): number {
  return nodes.reduce((acc, n) => {
    if (!n.isDir) return acc + 1
    return acc + (n.mdCount ?? 0)
  }, 0)
}
