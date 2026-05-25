import type { Freshness } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

export function getFreshness(modifiedAtMs: number): Freshness {
  const days = (Date.now() - modifiedAtMs) / DAY_MS
  if (days <= 3) return 'fresh'
  if (days <= 30) return 'warn'
  return 'stale'
}

export function getFreshnessColor(f: Freshness): string {
  return { fresh: '#a6e3a1', warn: '#f9e2af', stale: '#f38ba8' }[f]
}

export function formatAge(modifiedAtMs: number): string {
  const days = Math.floor((Date.now() - modifiedAtMs) / DAY_MS)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}
