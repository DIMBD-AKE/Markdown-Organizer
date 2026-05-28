import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { streamFileTree } from '../../src/main/fileTreeStream'
import { IPC } from '../../src/main/ipc/channels'
import type { FileNode } from '../../src/renderer/src/types'

type Event = { channel: string; payload: unknown }

function mockWin(): { win: { webContents: { send: (channel: string, payload: unknown) => void } }; events: Event[] } {
  const events: Event[] = []
  return {
    events,
    win: {
      webContents: {
        send: (channel: string, payload: unknown) => events.push({ channel, payload }),
      },
    },
  }
}

let tmpRoot: string

function mk(p: string) { fs.mkdirSync(p, { recursive: true }) }
function touch(p: string, content = '# md\n') { fs.writeFileSync(p, content, 'utf8') }

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdo-stream-test-'))
})

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('streamFileTree', () => {
  it('returns root node synchronously then emits FILE_TREE_COMPLETE', async () => {
    const dir = path.join(tmpRoot, 'empty')
    mk(dir)

    const { win, events } = mockWin()
    const { rootNode, done } = await streamFileTree(dir, win)

    expect(rootNode.isDir).toBe(true)
    expect(rootNode.path).toBe(dir)
    expect(rootNode.children).toEqual([])

    await done

    // Last event is COMPLETE
    expect(events[events.length - 1].channel).toBe(IPC.FILE_TREE_COMPLETE)
    expect(events[events.length - 1].payload).toEqual({ rootPath: dir })
  })

  it('emits one FILE_TREE_NODE per visited folder', async () => {
    const dir = path.join(tmpRoot, 'multi')
    mk(path.join(dir, 'a', 'b'))
    mk(path.join(dir, 'c'))
    touch(path.join(dir, 'r.md'))
    touch(path.join(dir, 'a', 'a1.md'))
    touch(path.join(dir, 'a', 'b', 'ab1.md'))
    touch(path.join(dir, 'c', 'c1.md'))

    const { win, events } = mockWin()
    const { done } = await streamFileTree(dir, win)
    await done

    const nodeEvents = events.filter((e) => e.channel === IPC.FILE_TREE_NODE)
    // dir, a, b, c → 4 folders walked
    expect(nodeEvents).toHaveLength(4)

    const completeEvents = events.filter((e) => e.channel === IPC.FILE_TREE_COMPLETE)
    expect(completeEvents).toHaveLength(1)
  })

  it('emits children in correct shape: dirs with empty children, files with modifiedAt', async () => {
    const dir = path.join(tmpRoot, 'shape')
    mk(path.join(dir, 'sub'))
    touch(path.join(dir, 'doc.md'))

    const { win, events } = mockWin()
    const { done } = await streamFileTree(dir, win)
    await done

    const rootEvent = events.find(
      (e) => e.channel === IPC.FILE_TREE_NODE && (e.payload as { parentPath: string }).parentPath === dir
    )
    expect(rootEvent).toBeDefined()
    const { children } = rootEvent!.payload as { parentPath: string; children: FileNode[] }
    const subDir = children.find((c) => c.name === 'sub')
    const docFile = children.find((c) => c.name === 'doc.md')

    expect(subDir).toMatchObject({ isDir: true, children: [] })
    expect(docFile?.isDir).toBe(false)
    expect(docFile?.modifiedAt).toBeGreaterThan(0)
  })

  it('excludes node_modules, .git, dist', async () => {
    const dir = path.join(tmpRoot, 'excludes')
    mk(path.join(dir, 'node_modules', 'pkg'))
    mk(path.join(dir, '.git'))
    mk(path.join(dir, 'dist'))
    mk(path.join(dir, 'src'))
    touch(path.join(dir, 'node_modules', 'pkg', 'README.md'))
    touch(path.join(dir, 'src', 'guide.md'))

    const { win, events } = mockWin()
    const { done } = await streamFileTree(dir, win)
    await done

    const allParents = events
      .filter((e) => e.channel === IPC.FILE_TREE_NODE)
      .map((e) => (e.payload as { parentPath: string }).parentPath)

    expect(allParents).not.toContain(path.join(dir, 'node_modules'))
    expect(allParents).not.toContain(path.join(dir, '.git'))
    expect(allParents).not.toContain(path.join(dir, 'dist'))
    expect(allParents).toContain(path.join(dir, 'src'))
  })

  it('excludes Unity-specific dirs when ProjectSettings+Assets present', async () => {
    const dir = path.join(tmpRoot, 'unity')
    mk(path.join(dir, 'Assets'))
    mk(path.join(dir, 'ProjectSettings'))
    mk(path.join(dir, 'Library'))
    mk(path.join(dir, 'Temp'))
    mk(path.join(dir, 'Docs'))
    touch(path.join(dir, 'Library', 'should-be-hidden.md'))
    touch(path.join(dir, 'Docs', 'guide.md'))

    const { win, events } = mockWin()
    const { done } = await streamFileTree(dir, win)
    await done

    const allParents = events
      .filter((e) => e.channel === IPC.FILE_TREE_NODE)
      .map((e) => (e.payload as { parentPath: string }).parentPath)

    expect(allParents).not.toContain(path.join(dir, 'Library'))
    expect(allParents).not.toContain(path.join(dir, 'Temp'))
    expect(allParents).toContain(path.join(dir, 'Docs'))
  })

  it('emits parent FILE_TREE_NODE before recursing into children', async () => {
    const dir = path.join(tmpRoot, 'order')
    mk(path.join(dir, 'a', 'b'))
    touch(path.join(dir, 'a', 'b', 'deep.md'))

    const { win, events } = mockWin()
    const { done } = await streamFileTree(dir, win)
    await done

    const nodeOrder = events
      .filter((e) => e.channel === IPC.FILE_TREE_NODE)
      .map((e) => (e.payload as { parentPath: string }).parentPath)

    const rootIdx = nodeOrder.indexOf(dir)
    const aIdx = nodeOrder.indexOf(path.join(dir, 'a'))
    const bIdx = nodeOrder.indexOf(path.join(dir, 'a', 'b'))

    expect(rootIdx).toBeGreaterThanOrEqual(0)
    expect(aIdx).toBeGreaterThan(rootIdx)
    expect(bIdx).toBeGreaterThan(aIdx)
  })

  it('emits FILE_TREE_ERROR for non-existent root', async () => {
    const dir = path.join(tmpRoot, 'does-not-exist')

    const { win, events } = mockWin()
    const { done } = await streamFileTree(dir, win)
    await done

    expect(events.some((e) => e.channel === IPC.FILE_TREE_ERROR)).toBe(true)
  })

  it('handles deep tree (4 levels × 3 dirs × 3 md files) without errors', async () => {
    const dir = path.join(tmpRoot, 'deep')
    function gen(p: string, depth: number) {
      if (depth === 0) {
        for (let i = 0; i < 3; i++) touch(path.join(p, `f${i}.md`))
        return
      }
      for (let i = 0; i < 3; i++) {
        const child = path.join(p, `d${i}`)
        mk(child)
        gen(child, depth - 1)
      }
    }
    mk(dir)
    gen(dir, 4)

    const { win, events } = mockWin()
    const start = Date.now()
    const { done } = await streamFileTree(dir, win)
    await done
    const elapsed = Date.now() - start

    const nodeEvents = events.filter((e) => e.channel === IPC.FILE_TREE_NODE)
    // Total folders: 1 + 3 + 3^2 + 3^3 + 3^4 = 1 + 3 + 9 + 27 + 81 = 121
    expect(nodeEvents.length).toBe(121)
    expect(events.some((e) => e.channel === IPC.FILE_TREE_COMPLETE)).toBe(true)
    expect(elapsed).toBeLessThan(5000)
  })
})
