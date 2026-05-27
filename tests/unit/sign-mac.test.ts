import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { collectTargets } = require('../../scripts/sign-mac.cjs') as {
  collectTargets: (dir: string, results: string[]) => string[]
}

let tmpApp: string

function mk(p: string) { fs.mkdirSync(p, { recursive: true }) }
function tch(p: string) { fs.writeFileSync(p, '', 'utf8') }

beforeAll(() => {
  // Mock Electron .app structure
  tmpApp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdo-sign-test-'))
  const contents = path.join(tmpApp, 'Contents')
  mk(path.join(contents, 'MacOS'))
  tch(path.join(contents, 'MacOS', 'Markdown Organizer'))  // primary binary (no ext)
  tch(path.join(contents, 'Info.plist'))

  // Frameworks
  const fwDir = path.join(contents, 'Frameworks')
  mk(fwDir)

  // Electron Framework
  const ef = path.join(fwDir, 'Electron Framework.framework')
  mk(path.join(ef, 'Versions', 'A', 'Libraries'))
  mk(path.join(ef, 'Versions', 'A', 'Resources', 'en.lproj'))
  tch(path.join(ef, 'Versions', 'A', 'Electron Framework'))  // primary binary
  tch(path.join(ef, 'Versions', 'A', 'Libraries', 'libffmpeg.dylib'))
  tch(path.join(ef, 'Versions', 'A', 'Libraries', 'libGLESv2.dylib'))
  tch(path.join(ef, 'Versions', 'A', 'Resources', 'en.lproj', 'locale.strings'))
  tch(path.join(ef, 'Versions', 'A', 'Resources', 'icudtl.dat'))
  tch(path.join(ef, 'Versions', 'A', 'Resources', 'en-US.pak'))

  // Helper.app
  const helper = path.join(fwDir, 'Markdown Organizer Helper.app')
  mk(path.join(helper, 'Contents', 'MacOS'))
  mk(path.join(helper, 'Contents', 'Resources', 'en.lproj'))
  tch(path.join(helper, 'Contents', 'MacOS', 'Markdown Organizer Helper'))
  tch(path.join(helper, 'Contents', 'Info.plist'))

  // Squirrel.framework
  const sq = path.join(fwDir, 'Squirrel.framework')
  mk(path.join(sq, 'Versions', 'A'))
  tch(path.join(sq, 'Versions', 'A', 'Squirrel'))

  // app.asar.unpacked native modules (.node files)
  const unpacked = path.join(contents, 'Resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release')
  mk(unpacked)
  tch(path.join(unpacked, 'better_sqlite3.node'))
  tch(path.join(contents, 'Resources', 'app.asar'))  // archive — should NOT be picked
})

afterAll(() => {
  fs.rmSync(tmpApp, { recursive: true, force: true })
})

describe('collectTargets', () => {
  it('picks .dylib files', () => {
    const targets = collectTargets(path.join(tmpApp, 'Contents'), [])
    const dylibs = targets.filter((t) => t.endsWith('.dylib'))
    expect(dylibs).toHaveLength(2)
    expect(dylibs.some((p) => p.endsWith('libffmpeg.dylib'))).toBe(true)
    expect(dylibs.some((p) => p.endsWith('libGLESv2.dylib'))).toBe(true)
  })

  it('picks .node files (native Node modules)', () => {
    const targets = collectTargets(path.join(tmpApp, 'Contents'), [])
    expect(targets.some((p) => p.endsWith('better_sqlite3.node'))).toBe(true)
  })

  it('picks .framework bundles', () => {
    const targets = collectTargets(path.join(tmpApp, 'Contents'), [])
    expect(targets.some((p) => p.endsWith('Electron Framework.framework'))).toBe(true)
    expect(targets.some((p) => p.endsWith('Squirrel.framework'))).toBe(true)
  })

  it('picks nested .app helper bundles', () => {
    const targets = collectTargets(path.join(tmpApp, 'Contents'), [])
    expect(targets.some((p) => p.endsWith('Markdown Organizer Helper.app'))).toBe(true)
  })

  it('does NOT pick .pak, .dat, .strings, .plist files', () => {
    const targets = collectTargets(path.join(tmpApp, 'Contents'), [])
    expect(targets.some((p) => p.endsWith('.pak'))).toBe(false)
    expect(targets.some((p) => p.endsWith('.dat'))).toBe(false)
    expect(targets.some((p) => p.endsWith('.strings'))).toBe(false)
    expect(targets.some((p) => p.endsWith('Info.plist'))).toBe(false)
  })

  it('does NOT pick app.asar archive', () => {
    const targets = collectTargets(path.join(tmpApp, 'Contents'), [])
    expect(targets.some((p) => p.endsWith('app.asar'))).toBe(false)
  })

  it('does NOT descend into .lproj dirs (skips localization)', () => {
    const targets = collectTargets(path.join(tmpApp, 'Contents'), [])
    expect(targets.some((p) => p.includes('.lproj'))).toBe(false)
  })

  it('bottom-up order: internal binaries before their containing bundle', () => {
    const targets = collectTargets(path.join(tmpApp, 'Contents'), [])

    const ffmpegIdx = targets.findIndex((p) => p.endsWith('libffmpeg.dylib'))
    const frameworkIdx = targets.findIndex((p) => p.endsWith('Electron Framework.framework'))
    expect(ffmpegIdx).toBeGreaterThanOrEqual(0)
    expect(frameworkIdx).toBeGreaterThan(ffmpegIdx)

    // Helper.app's internal binary (Contents/MacOS/Helper) has no .dylib/.so/.node ext
    // so not explicitly listed — Helper.app bundle sign covers it
    const helperIdx = targets.findIndex((p) => p.endsWith('Markdown Organizer Helper.app'))
    expect(helperIdx).toBeGreaterThanOrEqual(0)
  })

  it('does NOT include the top-level .app itself (caller signs it separately)', () => {
    // collectTargets starts at Contents/, never sees the parent .app dir
    const targets = collectTargets(path.join(tmpApp, 'Contents'), [])
    expect(targets.some((p) => p === tmpApp)).toBe(false)
  })

  it('returns empty array for non-existent dir', () => {
    const targets = collectTargets(path.join(tmpApp, 'does-not-exist'), [])
    expect(targets).toEqual([])
  })
})
