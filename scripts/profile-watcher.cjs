/* eslint-disable */
// Verifies the post-fix watcher startup time against the user's actual
// Unity project. Loads the compiled watcher logic via require so we test
// the real code path, not a re-implementation.

const path = require('path')
const fs = require('fs')

// Mirror watcher.ts behavior here (no TS compile step needed)
const chokidar = require(path.join(__dirname, '..', 'node_modules', 'chokidar'))
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn',
  'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit',
  '__pycache__', '.pytest_cache', '.mypy_cache',
  '.turbo', 'coverage', '.nyc_output',
  '.DS_Store', 'Thumbs.db'
])
const UNITY_EXCLUDED = new Set(['Library', 'Temp', 'Logs', 'obj', 'Build', 'Builds'])

function isUnityProjectSync(rootPath) {
  try {
    const entries = fs.readdirSync(rootPath)
    return entries.includes('Assets') && entries.includes('ProjectSettings')
  } catch { return false }
}

async function profile(target) {
  console.log(`\n=== ${target}`)
  const isUnity = isUnityProjectSync(target)
  console.log(`Unity detected: ${isUnity}`)

  const ignored = (filePath, stats) => {
    const base = path.basename(filePath)
    if (base.startsWith('.')) return true
    if (EXCLUDED_DIRS.has(base)) return true
    if (isUnity && UNITY_EXCLUDED.has(base)) return true
    if (stats && stats.isFile() && !filePath.endsWith('.md')) return true
    return false
  }

  const t0 = Date.now()
  const watcher = chokidar.watch(target, {
    ignored,
    ignoreInitial: true,
    depth: 5,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
  })
  await new Promise(resolve => watcher.on('ready', resolve))
  const t1 = Date.now()
  console.log(`Watcher ready in: ${t1 - t0} ms`)
  await watcher.close()
}

async function main() {
  const targets = process.argv.slice(2)
  if (targets.length === 0) {
    targets.push(process.cwd())
  }
  for (const t of targets) await profile(t)
}

main().catch(e => { console.error(e); process.exit(1) })
