import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface CapabilityConfig {
  permissions?: string[]
}

function readDefaultCapability(): CapabilityConfig {
  const capabilityPath = resolve(process.cwd(), 'src-tauri/capabilities/default.json')
  return JSON.parse(readFileSync(capabilityPath, 'utf8')) as CapabilityConfig
}

describe('Tauri default capability', () => {
  it('allows the renderer to start frameless window dragging', () => {
    const capability = readDefaultCapability()

    expect(capability.permissions).toContain('core:window:allow-start-dragging')
  })
})
