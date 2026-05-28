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
    // M9: zip target replaces dmg — ad-hoc sign survives zip archiving,
    // DMG layer added no Gatekeeper benefit while needing dmg-builder Python.
    target: [{ target: 'zip', arch: ['x64', 'arm64'] }],
    icon: 'build/icon.png',
    category: 'public.app-category.productivity',
    darkModeSupport: true,
    identity: null,
  },

  win: {
    // M9: portable + NSIS dual. NSIS recommended for daily use (fast startup,
    // no %TEMP% extract). Portable retained for USB / no-install scenarios.
    target: [
      { target: 'nsis',     arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'build/icon.ico',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: false,
    deleteAppDataOnUninstall: false,
    shortcutName: 'Markdown Organizer',
  },

  linux: {
    target: [{ target: 'AppImage', arch: ['x64'] }],
    icon: 'build/icon.png',
    category: 'Office',
    description: 'Desktop app for managing AI-generated Markdown documents',
    executableName: 'markdown-organizer',
  },
}
