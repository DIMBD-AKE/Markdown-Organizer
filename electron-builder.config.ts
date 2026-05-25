import { defineConfig } from 'electron-builder'

export default defineConfig({
  appId: 'com.markdown-organizer.app',
  productName: 'Markdown Organizer',
  directories: { buildResources: 'build' },
  files: ['out/**'],
  asarUnpack: ['**/node_modules/better-sqlite3/**/*', '**/node_modules/bindings/**/*'],
  mac: { target: [{ target: 'dmg', arch: ['x64', 'arm64'] }] },
  win: { target: [{ target: 'nsis', arch: ['x64'] }] },
  linux: { target: ['AppImage', 'deb'] }
})
