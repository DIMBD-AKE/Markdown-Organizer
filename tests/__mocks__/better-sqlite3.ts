// Wraps node:sqlite with a better-sqlite3-compatible API for use in vitest.
// better-sqlite3 is compiled for Electron's Node ABI — fails under system Node.
// node:sqlite is built into Node 22+ and has no native module issues.
//
// Uses createRequire to load node:sqlite at runtime, bypassing Vite's static
// module resolution which can't handle the node: protocol for non-standard builtins.
import { createRequire } from 'module'

const _require = createRequire(import.meta.url)

class Database {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private inner: any

  constructor(filename: string) {
    const { DatabaseSync } = _require('node:sqlite')
    this.inner = new DatabaseSync(filename)
  }

  pragma(pragma: string): void {
    this.inner.exec(`PRAGMA ${pragma}`)
  }

  exec(sql: string): void {
    this.inner.exec(sql)
  }

  prepare(sql: string) {
    const stmt = this.inner.prepare(sql)
    stmt.setReadBigInts(false)
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      run: (...args: any[]) => stmt.run(...args),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      all: (...args: any[]) => stmt.all(...args),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (...args: any[]) => stmt.get(...args),
    }
  }

  close(): void {
    this.inner.close()
  }
}

export default Database
