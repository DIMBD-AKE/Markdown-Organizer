import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { buildFileTree } from '../../src/main/fs'

let tmpRoot: string

function mkdirp(p: string) {
  fs.mkdirSync(p, { recursive: true })
}

function touch(p: string, content = '# md\n') {
  fs.writeFileSync(p, content, 'utf8')
}

function countNodes(node: ReturnType<typeof buildFileTree> extends Promise<infer T> ? T : never): number {
  if (!node.isDir) return 1
  return 1 + (node.children ?? []).reduce((a, c) => a + countNodes(c), 0)
}

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdo-fs-test-'))
})

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('buildFileTree', () => {
  it('returns empty-children tree for empty dir', async () => {
    const dir = path.join(tmpRoot, 'empty')
    mkdirp(dir)
    const tree = await buildFileTree(dir)
    expect(tree.isDir).toBe(true)
    expect(tree.children ?? []).toHaveLength(0)
    expect(tree.mdCount).toBe(0)
  })

  it('collects .md files in flat dir', async () => {
    const dir = path.join(tmpRoot, 'flat')
    mkdirp(dir)
    touch(path.join(dir, 'a.md'))
    touch(path.join(dir, 'b.md'))
    touch(path.join(dir, 'ignored.txt'))

    const tree = await buildFileTree(dir)
    const names = (tree.children ?? []).map((c) => c.name).sort()
    expect(names).toEqual(['a.md', 'b.md'])
    expect(tree.mdCount).toBe(2)
  })

  it('excludes default-excluded dirs (node_modules, .git, dist)', async () => {
    const dir = path.join(tmpRoot, 'excludes')
    mkdirp(path.join(dir, 'node_modules', 'pkg'))
    mkdirp(path.join(dir, '.git'))
    mkdirp(path.join(dir, 'dist'))
    mkdirp(path.join(dir, 'src'))
    touch(path.join(dir, 'node_modules', 'pkg', 'README.md'))
    touch(path.join(dir, 'src', 'guide.md'))

    const tree = await buildFileTree(dir)
    const childNames = (tree.children ?? []).map((c) => c.name)
    expect(childNames).not.toContain('node_modules')
    expect(childNames).not.toContain('.git')
    expect(childNames).not.toContain('dist')
    expect(childNames).toContain('src')
    expect(tree.mdCount).toBe(1)
  })

  it('excludes Unity-specific dirs (Library, Temp, obj) when ProjectSettings+Assets present', async () => {
    const dir = path.join(tmpRoot, 'unity')
    mkdirp(path.join(dir, 'Assets'))
    mkdirp(path.join(dir, 'ProjectSettings'))
    mkdirp(path.join(dir, 'Library'))
    mkdirp(path.join(dir, 'Temp'))
    mkdirp(path.join(dir, 'Docs'))
    touch(path.join(dir, 'Library', 'shouldnt-appear.md'))
    touch(path.join(dir, 'Docs', 'guide.md'))

    const tree = await buildFileTree(dir)
    const childNames = (tree.children ?? []).map((c) => c.name).sort()
    expect(childNames).not.toContain('Library')
    expect(childNames).not.toContain('Temp')
    expect(childNames).toContain('Docs')
    expect(tree.mdCount).toBe(1)
  })

  it('prunes empty subdirs (no .md descendants)', async () => {
    const dir = path.join(tmpRoot, 'prune')
    mkdirp(path.join(dir, 'has-md'))
    mkdirp(path.join(dir, 'no-md', 'deep'))
    touch(path.join(dir, 'has-md', 'doc.md'))
    touch(path.join(dir, 'no-md', 'deep', 'image.png'))

    const tree = await buildFileTree(dir)
    const childNames = (tree.children ?? []).map((c) => c.name)
    expect(childNames).toContain('has-md')
    expect(childNames).not.toContain('no-md')
  })

  it('handles deep tree with many files (concurrency stress)', async () => {
    const dir = path.join(tmpRoot, 'big')
    // 5 levels deep × 4 dirs × 5 md = 5^5 × 5 ≈ structure that previously caused I/O storm
    function gen(p: string, depth: number) {
      if (depth === 0) {
        for (let i = 0; i < 5; i++) touch(path.join(p, `f${i}.md`))
        return
      }
      for (let i = 0; i < 4; i++) {
        const child = path.join(p, `d${i}`)
        mkdirp(child)
        gen(child, depth - 1)
      }
    }
    mkdirp(dir)
    gen(dir, 4)

    const start = Date.now()
    const tree = await buildFileTree(dir)
    const elapsed = Date.now() - start

    // 4^4 = 256 leaf dirs × 5 md = 1280 md files
    expect(tree.mdCount).toBe(1280)
    // Sanity: with Semaphore(8), this should still finish in reasonable time.
    // Allow 10s upper bound (very generous — typically <2s on SSD).
    expect(elapsed).toBeLessThan(10000)
    // Verify structural integrity
    expect(countNodes(tree)).toBeGreaterThan(1280)
  }, 15000)

  it('returns sane node for non-existent path', async () => {
    const tree = await buildFileTree(path.join(tmpRoot, 'does-not-exist'))
    expect(tree.isDir).toBe(false)
    expect(tree.modifiedAt).toBe(0)
  })
})
