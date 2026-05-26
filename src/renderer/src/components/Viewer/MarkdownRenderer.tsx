import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeRaw from 'rehype-raw'
import { useViewerStore } from '../../stores/viewerStore'
import { extractToc } from '../../utils/toc'
import CodeBlock from './CodeBlock'
import MermaidDiagram from './MermaidDiagram'

interface Props { content: string; filePath: string }

export default function MarkdownRenderer({ content, filePath }: Props) {
  const setToc = useViewerStore((s) => s.setToc)

  useEffect(() => {
    setToc(extractToc(content))
  }, [content, setToc])

  const components: Components = {
    // Strip <pre> — CodeBlock/MermaidDiagram handle their own wrapper
    pre: ({ children }) => <>{children}</>,

    code({ className, children }) {
      const match = /language-(\w+)/.exec(className ?? '')
      if (match) {
        const code = String(children).replace(/\n$/, '')
        if (match[1] === 'mermaid') return <MermaidDiagram chart={code} />
        return <CodeBlock code={code} lang={match[1]} />
      }
      // Inline code
      return (
        <code className="bg-surface0 rounded px-1 py-0.5 text-[0.85em] font-mono text-blue">
          {children}
        </code>
      )
    },

    a({ href, children }) {
      const handleClick = (e: React.MouseEvent) => {
        if (href?.endsWith('.md')) {
          e.preventDefault()
          const lastSlash = filePath.lastIndexOf('/')
          const base = lastSlash >= 0 ? filePath.substring(0, lastSlash) : ''
          const abs = href.startsWith('/') ? href : `${base}/${href}`
          useViewerStore.getState().navigateTo(abs)
          window.api.readFile(abs).then(({ content: c, error }) => {
            if (c) useViewerStore.getState().setFile(abs, c)
            else useViewerStore.getState().setError(error ?? '읽기 실패')
          })
        }
      }
      return (
        <a href={href} onClick={handleClick} className="text-blue hover:underline">
          {children}
        </a>
      )
    },

    img({ src, alt }) {
      const lastSlash = filePath.lastIndexOf('/')
      const base = lastSlash >= 0 ? filePath.substring(0, lastSlash) : ''
      const resolved = src?.startsWith('http') ? src : `file://${base}/${src}`
      return <img src={resolved} alt={alt ?? ''} className="max-w-full rounded" />
    }
  }

  return (
    // font-sans = Geist (clean gothic) — dropped Literata per user request
    <article className="prose max-w-none px-8 py-8 font-sans text-text leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
