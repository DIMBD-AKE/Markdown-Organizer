// src/main/fileTreeStream.ts
// Progressive (eager-stream) file tree walker.
//
// Goal: never block the renderer. Caller invokes streamFileTree() and gets
// back a root FileNode immediately. Children of every folder arrive later
// via FILE_TREE_NODE events on the same BrowserWindow. A final
// FILE_TREE_COMPLETE event signals "no more nodes coming."
//
// Concurrency: shared Semaphore(8) caps real syscalls (same pattern as M8's
// buildFileTree). Recursion is unbounded — pending Promises queue cheaply
// in memory while only 8 readdir/stat run at any time.
//
// Pruning: unlike buildFileTree (which hides empty-of-md dirs after walk),
// this streamer emits every dir as soon as it's read. Empty folders are
// still visible — acceptable trade-off for non-blocking UX. Renderer can
// hide them post-COMPLETE if needed.

import fs from 'fs'
import path from 'path'
import type { BrowserWindow } from 'electron'
import { Semaphore, withSemaphore } from './concurrency'
import { IPC } from './ipc/channels'
import type { FileNode } from '../renderer/src/types'

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn',
  'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit',
  '__pycache__', '.pytest_cache', '.mypy_cache',
  '.turbo', 'coverage', '.nyc_output',
  '.DS_Store', 'Thumbs.db'
])

const UNITY_EXCLUDED = new Set(['Library', 'Temp', 'Logs', 'obj', 'Build', 'Builds'])

const FS_CONCURRENCY = 8

async function isUnityProject(dirPath: string, sem: Semaphore): Promise<boolean> {
  try {
    const entries = await withSemaphore(sem, () => fs.promises.readdir(dirPath))
    return entries.includes('Assets') && entries.includes('ProjectSettings')
  } catch {
    return false
  }
}

export interface StreamFileTreeResult {
  rootNode: FileNode
  /** Promise that resolves when the entire walk + emit cycle is done. */
  done: Promise<void>
}

/**
 * Build a file tree progressively, emitting one `FILE_TREE_NODE` event per
 * folder as soon as that folder's direct children are known. Returns the
 * root node synchronously (or after one root stat) so the UI can render
 * immediately.
 */
export async function streamFileTree(
  rootPath: string,
  win: Pick<BrowserWindow, 'webContents'>
): Promise<StreamFileTreeResult> {
  const sem = new Semaphore(FS_CONCURRENCY)
  const extraExcluded = (await isUnityProject(rootPath, sem)) ? UNITY_EXCLUDED : new Set<string>()

  let rootStat: fs.Stats
  try {
    rootStat = await withSemaphore(sem, () => fs.promises.stat(rootPath))
  } catch (err) {
    win.webContents.send(IPC.FILE_TREE_ERROR, { rootPath, error: (err as Error).message })
    return {
      rootNode: {
        name: path.basename(rootPath),
        path: rootPath,
        isDir: false,
        modifiedAt: 0,
      },
      done: Promise.resolve(),
    }
  }

  const rootNode: FileNode = {
    name: path.basename(rootPath),
    path: rootPath,
    isDir: true,
    modifiedAt: rootStat.mtimeMs,
    children: [],
  }

  const done = walkAndStream(rootPath, win, sem, extraExcluded)
    .then(() => {
      win.webContents.send(IPC.FILE_TREE_COMPLETE, { rootPath })
    })
    .catch((err) => {
      win.webContents.send(IPC.FILE_TREE_ERROR, { rootPath, error: (err as Error).message })
    })

  return { rootNode, done }
}

async function walkAndStream(
  dirPath: string,
  win: Pick<BrowserWindow, 'webContents'>,
  sem: Semaphore,
  extraExcluded: Set<string>
): Promise<void> {
  let entries: fs.Dirent[] = []
  try {
    entries = await withSemaphore(sem, () =>
      fs.promises.readdir(dirPath, { withFileTypes: true })
    )
  } catch {
    // Permission denied or vanished mid-walk — emit empty children and stop
    win.webContents.send(IPC.FILE_TREE_NODE, { parentPath: dirPath, children: [] })
    return
  }

  const visible = entries.filter(
    (e) =>
      !e.name.startsWith('.') &&
      !EXCLUDED_DIRS.has(e.name) &&
      !extraExcluded.has(e.name)
  )
  const dirs = visible.filter((e) => e.isDirectory())
  const files = visible.filter((e) => !e.isDirectory() && e.name.endsWith('.md'))

  // Folder placeholders — children: [] means "not yet streamed"
  const dirChildren: FileNode[] = dirs.map((d) => ({
    name: d.name,
    path: path.join(dirPath, d.name),
    isDir: true,
    modifiedAt: 0,
    children: [],
  }))

  // File stats (semaphore-bounded)
  const fileChildren: FileNode[] = await Promise.all(
    files.map(async (f) => {
      const fp = path.join(dirPath, f.name)
      try {
        const s = await withSemaphore(sem, () => fs.promises.stat(fp))
        return { name: f.name, path: fp, isDir: false, modifiedAt: s.mtimeMs }
      } catch {
        return { name: f.name, path: fp, isDir: false, modifiedAt: 0 }
      }
    })
  )

  win.webContents.send(IPC.FILE_TREE_NODE, {
    parentPath: dirPath,
    children: [...dirChildren, ...fileChildren],
  })

  // Recurse — Promise.all is safe; semaphore caps the real I/O underneath
  await Promise.all(
    dirs.map((d) => walkAndStream(path.join(dirPath, d.name), win, sem, extraExcluded))
  )
}
