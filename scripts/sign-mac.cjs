// scripts/sign-mac.cjs
// Selective bottom-up ad-hoc codesign for macOS .app bundles.
//
// Why selective (not codesign --deep): --deep recursively signs ALL files
// including locale.pak resource files, which historically triggered
// "Operation not permitted" on local builds. By targeting only Mach-O
// binaries (.dylib, .so, .node) + bundles (.framework, .app), we sign all
// loadable code while skipping non-code resources.
//
// Order: bottom-up. Each bundle's internal binaries get signed before the
// bundle itself, so the bundle's seal includes the nested signatures.

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function codesignAdHoc(target) {
  const r = spawnSync(
    'codesign',
    ['--force', '--sign', '-', '--timestamp=none', target],
    { stdio: 'pipe', encoding: 'utf8' }
  )
  if (r.status !== 0) {
    console.warn(`[sign-mac] FAIL (${r.status}) ${target}\n  ${r.stderr?.trim() ?? ''}`)
    return false
  }
  return true
}

function collectTargets(dir, results) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const e of entries) {
    const full = path.join(dir, e.name)

    if (e.isDirectory()) {
      // Skip localization dirs — no code, can trigger spurious sign attempts
      if (e.name.endsWith('.lproj')) continue

      const isBundle = e.name.endsWith('.framework') || e.name.endsWith('.app')
      if (isBundle) {
        // Descend FIRST → internal Mach-O signed before the bundle's seal
        collectTargets(full, results)
        results.push(full)
      } else {
        collectTargets(full, results)
      }
    } else if (e.isFile()) {
      // Mach-O candidates: .dylib (system), .so (some node modules), .node (N-API)
      if (/\.(dylib|so|node)$/i.test(e.name)) {
        results.push(full)
      }
    }
  }

  return results
}

function verify(appPath) {
  const r = spawnSync(
    'codesign',
    ['--verify', '--strict', '--deep', '--verbose=2', appPath],
    { stdio: 'pipe', encoding: 'utf8' }
  )
  if (r.status !== 0) {
    console.warn(`[sign-mac] VERIFY FAILED:\n${r.stderr ?? ''}`)
    return false
  }
  console.log(`[sign-mac] verified: ${appPath}`)
  return true
}

function signApp(appPath) {
  console.log(`[sign-mac] start: ${appPath}`)
  const contentsDir = path.join(appPath, 'Contents')

  if (!fs.existsSync(contentsDir)) {
    console.warn(`[sign-mac] Contents not found, skip: ${contentsDir}`)
    return
  }

  const targets = collectTargets(contentsDir, [])
  console.log(`[sign-mac] ${targets.length} internal targets`)

  let failed = 0
  for (const t of targets) {
    if (!codesignAdHoc(t)) failed++
  }

  // Top-level last — its seal incorporates all nested signatures
  if (!codesignAdHoc(appPath)) failed++

  console.log(`[sign-mac] signed ${targets.length + 1} items, ${failed} failures`)
  verify(appPath)
}

module.exports = { signApp, collectTargets, codesignAdHoc, verify }
