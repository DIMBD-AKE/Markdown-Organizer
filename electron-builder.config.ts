import { defineConfig } from 'electron-builder'
import { execSync } from 'child_process'

export default defineConfig({
  appId: 'com.markdown-organizer.app',
  productName: 'Markdown Organizer',
  copyright: `Copyright © ${new Date().getFullYear()} DIMBD-AKE`,
  directories: { buildResources: 'build', output: 'dist' },
  files: ['out/**'],
  asarUnpack: ['**/node_modules/better-sqlite3/**/*', '**/node_modules/bindings/**/*'],

  // Ad-hoc sign on macOS so Gatekeeper doesn't block with "damaged app" on arm64.
  // Runs after pack, before DMG creation. No Apple Developer ID required.
  afterPack: async (context) => {
    if (context.electronPlatformName !== 'darwin') return
    const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
    try {
      execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
    } catch {
      console.warn('[afterPack] Ad-hoc signing failed — continuing without signature')
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
  },
  dmg: {
    title: 'Markdown Organizer',
    contents: [
      { x: 130, y: 220, type: 'file' },
      { x: 410, y: 220, type: 'link', path: '/Applications' },
    ],
  },

  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'build/icon.png',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },

  linux: {
    target: [{ target: 'AppImage', arch: ['x64'] }],
    icon: 'build/icon.png',
    category: 'Office',
    description: 'Desktop app for managing AI-generated Markdown documents',
    executableName: 'markdown-organizer',
  },
})
