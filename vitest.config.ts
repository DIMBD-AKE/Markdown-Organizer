import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      // better-sqlite3 is compiled for Electron's Node ABI — fails under system Node.
      // Use the node:sqlite-backed wrapper for all tests.
      'better-sqlite3': path.resolve(__dirname, 'tests/__mocks__/better-sqlite3.ts')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    globals: true,
    server: {
      deps: {
        external: [/^node:/]
      }
    }
  }
})
