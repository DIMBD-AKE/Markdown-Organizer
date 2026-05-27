const { signApp } = require('./scripts/sign-mac.cjs')

module.exports = {
  appId: 'com.markdown-organizer.app',
  productName: 'Markdown Organizer',
  copyright: `Copyright © ${new Date().getFullYear()} DIMBD-AKE`,
  directories: { buildResources: 'build', output: 'dist' },
  files: ['out/**'],
  asarUnpack: ['**/node_modules/better-sqlite3/**/*', '**/node_modules/bindings/**/*'],
  compression: 'maximum',

  afterPack: async (context) => {
    if (context.electronPlatformName !== 'darwin') return
    const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
    signApp(appPath)
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
}
