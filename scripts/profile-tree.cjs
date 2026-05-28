/* eslint-disable */
// Windows file-tree profiling script.
// Measures the actual cost of buildFileTree, streamFileTree, and chokidar
// startup against a user-provided directory.
//
// Usage:
//   node scripts/profile-tree.cjs <projectPath>
//
// Output: timings for each operation + breakdown of where time is spent.

const fs = require('fs')
const path = require('path')
const os = require('os')

const target = process.argv[2] || process.cwd()
if (!fs.existsSync(target)) {
  console.error(`Path not found: ${target}`)
  process.exit(1)
}

console.log(`\n=== Profiling target: ${target}`)
console.log(`Platform: ${process.platform} ${os.release()}  CPUs: ${os.cpus().length}\n`)

// ─── Reproduce buildFileTree logic (with empty-dir pruning) ───
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn',
  'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit',
  '__pycache__', '.pytest_cache', '.mypy_cache',
  '.turbo', 'coverage', '.nyc_output',
  '.DS_Store', 'Thumbs.db'
])

class Semaphore {
  constructor(n) { this.permits = n; this.waiting = [] }
  async acquire() {
    if (this.permits > 0) { this.permits--; return }
    return new Promise(r => this.waiting.push(r))
  }
  release() {
    const next = this.waiting.shift()
    if (next) next(); else this.permits++
  }
}
async function withSem(sem, fn) {
  await sem.acquire()
  try { return await fn() } finally { sem.release() }
}

let statCount = 0
let readdirCount = 0
let dirCount = 0
let fileCount = 0
let mdCount = 0
let excludedHits = 0

async function walk(dirPath, sem) {
  let entries = []
  try {
    readdirCount++
    entries = await withSem(sem, () => fs.promises.readdir(dirPath, { withFileTypes: true }))
  } catch { return { dir: false, mdCount: 0 } }

  const visible = entries.filter(e => {
    if (e.name.startsWith('.')) return false
    if (EXCLUDED_DIRS.has(e.name)) { excludedHits++; return false }
    return true
  })
  const dirs = visible.filter(e => e.isDirectory())
  const files = visible.filter(e => !e.isDirectory() && e.name.endsWith('.md'))
  dirCount += dirs.length
  fileCount += files.length
  mdCount += files.length

  await Promise.all([
    Promise.all(dirs.map(d => walk(path.join(dirPath, d.name), sem))),
    Promise.all(files.map(async f => {
      statCount++
      try { await withSem(sem, () => fs.promises.stat(path.join(dirPath, f.name))) } catch {}
    }))
  ])
}

// ─── Run profile ───
async function main() {
  // 1. buildFileTree-equivalent walk with semaphore(8)
  console.log('--- buildFileTree-equivalent (semaphore=8) ---')
  statCount = readdirCount = dirCount = fileCount = mdCount = excludedHits = 0
  const t0 = Date.now()
  await walk(target, new Semaphore(8))
  const t1 = Date.now()
  console.log(`  Elapsed: ${t1 - t0} ms`)
  console.log(`  readdir calls: ${readdirCount}`)
  console.log(`  stat calls (md only): ${statCount}`)
  console.log(`  Dirs visited: ${dirCount}  Markdown files: ${mdCount}`)
  console.log(`  Excluded dirs hit (node_modules etc.): ${excludedHits}`)

  // 2. Same with semaphore=16
  console.log('\n--- buildFileTree-equivalent (semaphore=16) ---')
  statCount = readdirCount = dirCount = fileCount = mdCount = excludedHits = 0
  const t2 = Date.now()
  await walk(target, new Semaphore(16))
  const t3 = Date.now()
  console.log(`  Elapsed: ${t3 - t2} ms`)

  // 3. Same with semaphore=32
  console.log('\n--- buildFileTree-equivalent (semaphore=32) ---')
  statCount = readdirCount = dirCount = fileCount = mdCount = excludedHits = 0
  const t4 = Date.now()
  await walk(target, new Semaphore(32))
  const t5 = Date.now()
  console.log(`  Elapsed: ${t5 - t4} ms`)

  // 4. Chokidar startup — current settings (no ignores beyond dotfiles)
  console.log('\n--- chokidar startup: current settings (only dotfile filter) ---')
  const chokidar = require(path.join(__dirname, '..', 'node_modules', 'chokidar'))
  const watcher1 = chokidar.watch(target, {
    ignored: /(^|[/\\])\../,
    ignoreInitial: true,
    depth: 5,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
  })
  const w0 = Date.now()
  let addCount = 0
  await new Promise(resolve => {
    watcher1.on('add', () => addCount++)
    watcher1.on('addDir', () => addCount++)
    watcher1.on('ready', resolve)
  })
  const w1 = Date.now()
  console.log(`  Ready in: ${w1 - w0} ms`)
  console.log(`  Files+dirs registered: ${addCount}`)
  await watcher1.close()

  // 5. Chokidar startup — with EXCLUDED_DIRS ignored
  console.log('\n--- chokidar startup: + EXCLUDED_DIRS ignored ---')
  const excludedList = Array.from(EXCLUDED_DIRS)
  const watcher2 = chokidar.watch(target, {
    ignored: (filePath) => {
      const base = path.basename(filePath)
      if (base.startsWith('.')) return true
      return EXCLUDED_DIRS.has(base)
    },
    ignoreInitial: true,
    depth: 5,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
  })
  const w2 = Date.now()
  addCount = 0
  await new Promise(resolve => {
    watcher2.on('add', () => addCount++)
    watcher2.on('addDir', () => addCount++)
    watcher2.on('ready', resolve)
  })
  const w3 = Date.now()
  console.log(`  Ready in: ${w3 - w2} ms`)
  console.log(`  Files+dirs registered: ${addCount}`)
  await watcher2.close()

  // 5b. Chokidar startup — current EXCLUDED_DIRS + UNITY_EXCLUDED
  const UNITY_EXCLUDED = new Set(['Library', 'Temp', 'Logs', 'obj', 'Build', 'Builds'])
  console.log('\n--- chokidar startup: + EXCLUDED_DIRS + UNITY_EXCLUDED ---')
  const watcherU = chokidar.watch(target, {
    ignored: (filePath) => {
      const base = path.basename(filePath)
      if (base.startsWith('.')) return true
      if (EXCLUDED_DIRS.has(base)) return true
      if (UNITY_EXCLUDED.has(base)) return true
      return false
    },
    ignoreInitial: true,
    depth: 5,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
  })
  const wU0 = Date.now()
  addCount = 0
  await new Promise(resolve => {
    watcherU.on('add', () => addCount++)
    watcherU.on('addDir', () => addCount++)
    watcherU.on('ready', resolve)
  })
  const wU1 = Date.now()
  console.log(`  Ready in: ${wU1 - wU0} ms`)
  await watcherU.close()

  // 6. Chokidar startup — additionally restricted to .md
  console.log('\n--- chokidar startup: + .md only ---')
  const watcher3 = chokidar.watch(target, {
    ignored: (filePath, stats) => {
      const base = path.basename(filePath)
      if (base.startsWith('.')) return true
      if (EXCLUDED_DIRS.has(base)) return true
      if (stats && stats.isFile() && !filePath.endsWith('.md')) return true
      return false
    },
    ignoreInitial: true,
    depth: 5,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
  })
  const w4 = Date.now()
  addCount = 0
  await new Promise(resolve => {
    watcher3.on('add', () => addCount++)
    watcher3.on('addDir', () => addCount++)
    watcher3.on('ready', resolve)
  })
  const w5 = Date.now()
  console.log(`  Ready in: ${w5 - w4} ms`)
  console.log(`  Files+dirs registered: ${addCount}`)
  await watcher3.close()

  console.log('\n=== Done ===\n')
}

main().catch(e => { console.error(e); process.exit(1) })
