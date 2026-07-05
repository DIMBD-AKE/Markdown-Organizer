#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const tag = process.argv.find((arg) => arg.startsWith('--tag='))?.slice('--tag='.length) ?? `v${pkg.version}`
const notesFile = process.argv.find((arg) => arg.startsWith('--notes-file='))?.slice('--notes-file='.length)
const prepareOnly = process.argv.includes('--prepare-only')
const version = tag.replace(/^v/, '')
const bundleDir = path.join(root, 'src-tauri', 'target', 'release', 'bundle')
const stageDir = path.join(root, 'dist', 'release', tag)
const productSlug = pkg.name
  .split(/[^a-zA-Z0-9]+/)
  .filter(Boolean)
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join('')
const arch = process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x64' : process.arch

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function commandExists(command) {
  const result = spawnSync(command, ['--version'], { stdio: 'ignore' })
  return result.status === 0
}

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

function firstExisting(paths) {
  return paths.find((file) => fs.existsSync(file))
}

function copyArtifact(source, name) {
  const target = path.join(stageDir, name)
  fs.copyFileSync(source, target)
  return target
}

function sha256(file) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(file))
  return hash.digest('hex')
}

function matchesCurrentVersion(file) {
  const basename = path.basename(file)
  return basename.includes(version) || !/\d+\.\d+\.\d+/.test(basename)
}

if (!commandExists('gh')) {
  console.error('GitHub CLI is required: https://cli.github.com/')
  process.exit(1)
}

fs.rmSync(stageDir, { recursive: true, force: true })
fs.mkdirSync(stageDir, { recursive: true })

const artifacts = []
const macApp = firstExisting([
  path.join(bundleDir, 'macos', `${pkg.productName ?? 'Markdown Organizer'}.app`),
  path.join(bundleDir, 'macos', 'Markdown Organizer.app'),
])

if (macApp) {
  const zipName = `${productSlug}_${version}_${arch}.app.zip`
  const zipPath = path.join(stageDir, zipName)
  run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', macApp, zipPath])
  artifacts.push(zipPath)
}

const sourceArtifacts = walk(bundleDir).filter((file) =>
  /\.(dmg|msi|exe|AppImage|deb|rpm|tar\.gz|zip)$/i.test(file) && matchesCurrentVersion(file)
)

for (const file of sourceArtifacts) {
  if (file.includes(`${path.sep}macos${path.sep}`)) continue
  if (file.endsWith('.app.tar.gz')) continue

  const ext = path.extname(file)
  const lower = file.toLowerCase()
  let name = path.basename(file).replaceAll(' ', '')
  if (lower.endsWith('.dmg')) name = `${productSlug}_${version}_${arch}.dmg`
  else if (lower.endsWith('.appimage')) name = `${productSlug}_${version}_${arch}.AppImage`
  else if (lower.endsWith('.exe')) name = `${productSlug}_${version}_${arch}.exe`
  else if (lower.endsWith('.msi')) name = `${productSlug}_${version}_${arch}.msi`
  else if (ext) name = `${productSlug}_${version}_${arch}${ext}`

  artifacts.push(copyArtifact(file, name))
}

if (artifacts.length === 0) {
  console.error(`No release artifacts found in ${bundleDir}`)
  console.error('Run a local build first, for example: npm run build:mac')
  process.exit(1)
}

const checksumFile = path.join(stageDir, `SHA256SUMS_${version}.txt`)
const checksums = artifacts
  .map((file) => `${sha256(file)}  ${path.basename(file)}`)
  .join('\n')
fs.writeFileSync(checksumFile, `${checksums}\n`)
artifacts.unshift(checksumFile)

if (prepareOnly) {
  console.log(`Staged release artifacts in ${stageDir}`)
  for (const artifact of artifacts) {
    console.log(path.basename(artifact))
  }
  process.exit(0)
}

const releaseExists = spawnSync('gh', ['release', 'view', tag], { stdio: 'ignore' }).status === 0
const notesArgs = notesFile ? ['--notes-file', path.resolve(root, notesFile)] : ['--notes', `Release ${tag}`]
if (!releaseExists) {
  run('gh', ['release', 'create', tag, '--title', tag, ...notesArgs])
} else if (notesFile) {
  run('gh', ['release', 'edit', tag, '--title', tag, ...notesArgs])
}

run('gh', ['release', 'upload', tag, ...artifacts, '--clobber'])
console.log(`Staged release artifacts in ${stageDir}`)
console.log(`Uploaded ${artifacts.length} artifact(s) to ${tag}`)
