import { useEffect, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeRaw from 'rehype-raw'
import { useViewerStore } from '../../stores/viewerStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import { useSearchStore } from '../../stores/searchStore'
import { extractToc } from '../../utils/toc'
import CodeBlock from './CodeBlock'
import MermaidDiagram from './MermaidDiagram'

interface Props { content: string; filePath: string }

// ── Helper functions (outside component to avoid recreating on every render) ──

function clearMarks(container: HTMLElement): void {
  const marks = container.querySelectorAll('mark.search-mark')
  const parents = new Set<Node>()
  marks.forEach(mark => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
    parents.add(parent)
  })
  parents.forEach(p => (p as Element).normalize())
}

function buildHighlightRegex(query: string, mode: 'string' | 'regex'): RegExp | null {
  try {
    if (mode === 'string') {
      // Escape special chars except wildcards, then convert * → .* and ? → .
      const escaped = query.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      const withWildcards = escaped.replace(/\*/g, '.*').replace(/\?/g, '.')
      return new RegExp(withWildcards, 'gi')
    } else {
      return new RegExp(query, 'gi')
    }
  } catch (e) {
    if (e instanceof SyntaxError) return null
    throw e
  }
}

function insertMarks(container: HTMLElement, regex: RegExp): HTMLElement[] {
  const marks: HTMLElement[] = []
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodesToProcess: Text[] = []

  let node: Node | null
  while ((node = walker.nextNode())) {
    nodesToProcess.push(node as Text)
  }

  for (const textNode of nodesToProcess) {
    const text = textNode.textContent ?? ''
    if (!text.trim()) continue

    regex.lastIndex = 0
    const matches: Array<{ start: number; end: number }> = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      if (match[0].length === 0) { regex.lastIndex++; continue }
      matches.push({ start: match.index, end: match.index + match[0].length })
    }

    if (matches.length === 0) continue

    const parent = textNode.parentNode
    if (!parent) continue

    const fragment = document.createDocumentFragment()
    let lastIndex = 0

    for (const { start, end } of matches) {
      if (start > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)))
      }
      const mark = document.createElement('mark')
      mark.className = 'search-mark'
      mark.textContent = text.slice(start, end)
      fragment.appendChild(mark)
      marks.push(mark)
      lastIndex = end
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
    }

    parent.replaceChild(fragment, textNode)
  }

  return marks
}

/** Returns dirs that need to be in expandedDirs so `filePath` is visible in the tree.
 *  Root's direct children are always visible, so root itself is excluded. */
function collectParentDirs(filePath: string, root: string): string[] {
  const normRoot = root.endsWith('/') ? root.slice(0, -1) : root
  const dirs: string[] = []
  let dir = filePath.substring(0, filePath.lastIndexOf('/'))
  while (dir !== normRoot && dir.startsWith(normRoot) && dir.length > normRoot.length) {
    dirs.push(dir)
    dir = dir.substring(0, dir.lastIndexOf('/'))
  }
  return dirs
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarkdownRenderer({ content, filePath }: Props) {
  const setToc = useViewerStore((s) => s.setToc)
  const articleRef = useRef<HTMLElement>(null)

  // Search store — individual selectors (never destructure)
  const activeFilePath = useSearchStore((s) => s.activeFilePath)
  const activeMatchIndex = useSearchStore((s) => s.activeMatchIndex)
  const searchQuery = useSearchStore((s) => s.query)
  const searchMode = useSearchStore((s) => s.mode)
  const setTotalMatchCount = useSearchStore((s) => s.setTotalMatchCount)

  useEffect(() => {
    setToc(extractToc(content))
  }, [content, setToc])

  // Effect 1 — Insert marks when content/search changes
  useEffect(() => {
    const el = articleRef.current
    if (!el) return

    clearMarks(el)

    if (activeFilePath !== filePath || !searchQuery.trim()) {
      setTotalMatchCount(0)
      return
    }

    const regex = buildHighlightRegex(searchQuery, searchMode)
    if (!regex) {
      setTotalMatchCount(0)
      return
    }

    const marks = insertMarks(el, regex)
    setTotalMatchCount(marks.length)

    if (marks.length > 0) {
      const initialIndex = Math.min(activeMatchIndex, marks.length - 1)
      marks[initialIndex].classList.add('mark-current')
      marks[initialIndex].scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [filePath, content, activeFilePath, activeMatchIndex, searchQuery, searchMode, setTotalMatchCount])

  // Effect 2 — Update current mark when index changes
  useEffect(() => {
    const el = articleRef.current
    if (!el) return

    const marks = Array.from(el.querySelectorAll<HTMLElement>('mark.search-mark'))
    if (marks.length === 0) return

    marks.forEach(m => m.classList.remove('mark-current'))
    const target = marks[activeMatchIndex]
    if (target) {
      target.classList.add('mark-current')
      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [activeMatchIndex])

  // Memoize plugin arrays to prevent ReactMarkdown from remounting child components
  const remarkPluginsArr = useMemo(() => [remarkGfm], [])
  const rehypePluginsArr = useMemo(() => [rehypeRaw, rehypeSlug], [])

  // Memoize components so ReactMarkdown receives stable function references across
  // re-renders. Without this, every parent re-render creates new component types →
  // ReactMarkdown unmounts and remounts all code blocks → state (collapsed, svg) resets.
  // Only re-create when filePath changes (a/img handlers resolve relative paths from it).
  const components = useMemo<Components>(() => ({
    // Strip <pre> — CodeBlock/MermaidDiagram handle their own wrapper
    pre: ({ children }) => <>{children}</>,

    code({ className, children }) {
      const match = /language-(\w+)/.exec(className ?? '')
      if (match) {
        const code = String(children).replace(/\n$/, '')
        if (match[1] === 'mermaid') return <MermaidDiagram chart={code} />
        return <CodeBlock code={code} lang={match[1]} />
      }
      return (
        <code className="bg-surface0 rounded px-1 py-0.5 text-[0.85em] font-mono text-blue">
          {children}
        </code>
      )
    },

    a({ href, children }) {
      const handleClick = (e: React.MouseEvent) => {
        if (!href) return
        if (/^https?:\/\//i.test(href)) {
          e.preventDefault()
          window.api.openExternal(href)
          return
        }
        // Anchor-only links (#heading) — let rehype-slug handle scroll natively
        if (href.startsWith('#')) return

        // Decode percent-encoded Unicode paths (e.g. %EC%B4%88%EC%95%88.md → 초안.md)
        const decoded = decodeURIComponent(href)
        const normPath = filePath.replace(/\\/g, '/')
        const base = normPath.substring(0, normPath.lastIndexOf('/'))
        const abs = decoded.startsWith('/') ? decoded : `${base}/${decoded}`

        if (decoded.endsWith('.md')) {
          e.preventDefault()
          window.api.readFile(abs).then(({ content: c, error }) => {
            if (c) {
              useViewerStore.getState().setFile(abs, c)
              // Sync left-panel selection and expand ancestor dirs
              const root = useFileTreeStore.getState().tree?.path ?? ''
              useFileTreeStore.getState().expandDirs(collectParentDirs(abs, root))
              useFileTreeStore.getState().setSelectedFile(abs)
            } else {
              useViewerStore.getState().setError(error ?? '읽기 실패')
            }
          })
          return
        }

        // Non-http, non-.md → treat as directory link.
        // Prevent navigation crash; highlight the dir in the file tree instead.
        e.preventDefault()
        const root = useFileTreeStore.getState().tree?.path ?? ''
        useFileTreeStore.getState().expandDirs(collectParentDirs(abs, root))
        useFileTreeStore.getState().setSelectedFile(abs)
      }
      return (
        <a href={href} onClick={handleClick} className="text-blue hover:underline">
          {children}
        </a>
      )
    },

    img({ src, alt }) {
      if (src?.startsWith('http')) {
        return <img src={src} alt={alt ?? ''} className="max-w-full rounded" />
      }
      const normPath = filePath.replace(/\\/g, '/')
      const base = normPath.substring(0, normPath.lastIndexOf('/'))
      // Ensure three slashes for both Unix (/path) and Windows (C:/path)
      const absBase = base.startsWith('/') ? base : `/${base}`
      const resolved = `file://${absBase}/${src ?? ''}`
      return <img src={resolved} alt={alt ?? ''} className="max-w-full rounded" />
    }
  }), [filePath])

  return (
    <article ref={articleRef} className="prose max-w-none px-8 py-8 font-sans text-text leading-relaxed">
      <ReactMarkdown
        remarkPlugins={remarkPluginsArr}
        rehypePlugins={rehypePluginsArr}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
