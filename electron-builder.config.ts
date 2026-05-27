import { defineConfig } from 'electron-builder'
import { spawnSync } from 'child_process'

export default defineConfig({
  appId: 'com.markdown-organizer.app',
  productName: 'Markdown Organizer',
  copyright: `Copyright © ${new Date().getFullYear()} DIMBD-AKE`,
  directories: { buildResources: 'build', output: 'dist' },
  files: ['out/**'],
  asarUnpack: ['**/node_modules/better-sqlite3/**/*', '**/node_modules/bindings/**/*'],

  // Ad-hoc sign on macOS before DMG creation.
  // Reduces Gatekeeper "damaged app" probability on arm64 unsigned builds.
  // Note: notarization still required for full bypass; users may need xattr -cr on first launch.
  afterPack: async (context) => {
    if (context.electronPlatformName !== 'darwin') return
    const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
    console.log(`[afterPack] ad-hoc signing: ${appPath}`)
    const result = spawnSync('codesign', ['--force', '--sign', '-', appPath], {
      stdio: 'inherit',
    })
    if (result.status !== 0) {
      console.warn(`[afterPack] codesign exited ${result.status} — continuing unsigned`)
    }
  },

  publish: {
    provider: 'github',
    owner: 'DIMBD-AKE',
    repo: 'Markdown-Organizer',
  },

  mac: {
    target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
    icon: 'build/icon.png',
    category: 'public.app-category.productivity',
    darkModeSupport: true,
    identity: null,
  },
  dmg: {
    title: 'Markdown Organizer',
    contents: [
      { x: 130, y: 220, type: 'file' },
      { x: 410, y: 220, type: 'link', path: '/Applications' },
    ],
  },

  win: {
    target: [{ target: 'portable', arch: ['x64'] }],
    icon: 'build/icon.ico',
  },

  linux: {
    target: [{ target: 'AppImage', arch: ['x64'] }],
    icon: 'build/icon.png',
    category: 'Office',
    description: 'Desktop app for managing AI-generated Markdown documents',
    executableName: 'markdown-organizer',
  },
})
