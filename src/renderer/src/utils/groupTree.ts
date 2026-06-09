import type { FileNode } from '../types'
import { sortTree, type SortField, type SortOrder } from './sortTree'

/** Day-group count above which date groups roll up to month granularity. */
const MONTH_ROLLUP_THRESHOLD = 12

const DATE_RE = /^(\d{4})[-_.]?(\d{2})[-_.]?(\d{2})(?:\D|$)/

/** Extract a normalized `YYYY-MM-DD` date key from a filename, or null. */
function dateKey(name: string): string | null {
  const m = DATE_RE.exec(name)
  if (!m) return null
  const [, y, mo, d] = m
  const month = Number(mo)
  const day = Number(d)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${y}-${mo}-${d}`
}

/** Leading token before the first delimiter (-, _, space), minus extension. */
function prefixKey(name: string): string {
  const base = name.replace(/\.md$/i, '')
  const token = base.split(/[-_ ]/)[0]
  return token
}

function virtualNode(parentPath: string, key: string, label: string, children: FileNode[]): FileNode {
  return {
    name: label,
    path: `${parentPath}::group::${key}`,
    isDir: true,
    isVirtual: true,
    children,
    mdCount: children.length,
    modifiedAt: children.reduce((max, c) => Math.max(max, c.modifiedAt), 0),
  }
}

/**
 * Build presentational virtual-folder groups from filename patterns, per real
 * directory. Date prefixes take priority over common text prefixes.
 *
 * Date grouping triggers on the *format*, not the value: when 2+ files in a
 * directory match the date format, every distinct date becomes its own group —
 * including singleton dates. Only when a lone dated file is the sole match does
 * it stay loose. Common-prefix grouping still requires 2+ files sharing a key.
 *
 * Recurses into real subdirectories. Pure / immutable. Output ordered via
 * {@link sortTree}.
 */
export function groupTree(
  nodes: FileNode[],
  parentPath: string,
  field: SortField,
  order: SortOrder
): FileNode[] {
  const dirs: FileNode[] = []
  const files: FileNode[] = []
  for (const n of nodes) {
    if (n.isDir) {
      dirs.push(n.children ? { ...n, children: groupTree(n.children, n.path, field, order) } : n)
    } else {
      files.push(n)
    }
  }

  // 1. Date grouping (priority).
  const dated = new Map<string, FileNode[]>()
  const remaining: FileNode[] = []
  for (const f of files) {
    const key = dateKey(f.name)
    if (key) {
      const arr = dated.get(key) ?? []
      arr.push(f)
      dated.set(key, arr)
    } else {
      remaining.push(f)
    }
  }

  // Month rollup when too many distinct day groups.
  let dateGroups = dated
  let dateGranularity: 'day' | 'month' = 'day'
  if (dated.size > MONTH_ROLLUP_THRESHOLD) {
    const monthly = new Map<string, FileNode[]>()
    for (const [key, arr] of dated) {
      const month = key.slice(0, 7)
      monthly.set(month, [...(monthly.get(month) ?? []), ...arr])
    }
    dateGroups = monthly
    dateGranularity = 'month'
  }

  const virtuals: FileNode[] = []
  const loose: FileNode[] = []

  // Group on the date *format*: if 2+ files in this directory carry a date,
  // every date becomes a group (singletons included). A lone dated file with no
  // sibling date stays loose.
  const datedFormatQualifies = files.length - remaining.length >= 2
  for (const [key, arr] of dateGroups) {
    if (datedFormatQualifies) {
      virtuals.push(virtualNode(parentPath, `date:${key}`, key, sortTree(arr, field, order)))
    } else {
      loose.push(...arr)
    }
  }
  // Date granularity unused beyond key length; retained for clarity.
  void dateGranularity

  // 2. Common-prefix grouping for the rest.
  const byPrefix = new Map<string, FileNode[]>()
  for (const f of remaining) {
    const key = prefixKey(f.name)
    byPrefix.set(key, [...(byPrefix.get(key) ?? []), f])
  }
  for (const [key, arr] of byPrefix) {
    if (arr.length >= 2) {
      virtuals.push(virtualNode(parentPath, `prefix:${key}`, key, sortTree(arr, field, order)))
    } else {
      loose.push(...arr)
    }
  }

  return sortTree([...dirs, ...virtuals, ...loose], field, order)
}
