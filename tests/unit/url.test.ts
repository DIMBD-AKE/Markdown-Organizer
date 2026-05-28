import { describe, it, expect } from 'vitest'
import { isAllowedExternalUrl } from '../../src/main/url'

describe('isAllowedExternalUrl', () => {
  it('allows https URLs', () => {
    expect(isAllowedExternalUrl('https://example.com')).toBe(true)
    expect(isAllowedExternalUrl('https://shields.io/badge/x.svg')).toBe(true)
  })

  it('allows http URLs', () => {
    expect(isAllowedExternalUrl('http://example.com')).toBe(true)
  })

  it('case-insensitive protocol match', () => {
    expect(isAllowedExternalUrl('HTTPS://example.com')).toBe(true)
    expect(isAllowedExternalUrl('HtTp://example.com')).toBe(true)
  })

  it('rejects javascript: scheme (XSS)', () => {
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedExternalUrl('JAVASCRIPT:alert(1)')).toBe(false)
  })

  it('rejects file:// scheme', () => {
    expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects data: scheme', () => {
    expect(isAllowedExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('rejects mailto:', () => {
    expect(isAllowedExternalUrl('mailto:foo@bar.com')).toBe(false)
  })

  it('rejects bare paths', () => {
    expect(isAllowedExternalUrl('/etc/passwd')).toBe(false)
    expect(isAllowedExternalUrl('./relative.md')).toBe(false)
    expect(isAllowedExternalUrl('relative.md')).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(isAllowedExternalUrl(null)).toBe(false)
    expect(isAllowedExternalUrl(undefined)).toBe(false)
    expect(isAllowedExternalUrl(123)).toBe(false)
    expect(isAllowedExternalUrl({ url: 'https://x.com' })).toBe(false)
  })

  it('rejects empty/whitespace string', () => {
    expect(isAllowedExternalUrl('')).toBe(false)
    expect(isAllowedExternalUrl('   ')).toBe(false)
  })

  it('rejects http-lookalike (httpsx://) — strict scheme match', () => {
    expect(isAllowedExternalUrl('httpsx://example.com')).toBe(false)
  })
})
