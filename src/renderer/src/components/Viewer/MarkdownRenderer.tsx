import { useMemo, useEffect } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeReact from 'rehype-react'
import { createElement, Fragment } from 'react'
import CodeBlock from './CodeBlock'
import MermaidDiagram from './MermaidDiagram'
import { useViewerStore } from '../../stores/viewerStore'
import { extractToc } from '../../utils/toc'

interface Props { content: string; filePath: string }

export default function MarkdownRenderer({ content, filePath }: Props) {
  const setToc = useViewerStore((s) => s.setToc)

  useEffect(() => {
    setToc(extractToc(content))
  }, [content, setToc])

  const element = useMemo(() => {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeReact, {
        createElement,
        Fragment,
        components: {
          code({ className, children, ...props }: any) {
            const lang = (className ?? '').replace('language-', '')
            const code = String(children).trim()
            if (lang === 'mermaid') return <MermaidDiagram chart={code} />
            if (lang) return <CodeBlock code={code} lang={lang} />
            return <code className="bg-surface0 rounded px-1 py-0.5 text-sm font-mono text-mauve" {...props}>{children}</code>
          },
          a({ href, children, ...props }: any) {
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
            return <a href={href} onClick={handleClick} className="text-blue hover:underline" {...props}>{children}</a>
          },
          img({ src, alt, ...props }: any) {
            const lastSlash = filePath.lastIndexOf('/')
            const base = lastSlash >= 0 ? filePath.substring(0, lastSlash) : ''
            const resolved = src?.startsWith('http') ? src : `file://${base}/${src}`
            return <img src={resolved} alt={alt} className="max-w-full rounded" {...props} />
          }
        }
      })
    return processor.processSync(content).result as React.ReactElement
  }, [content, filePath])

  return (
    <article className="prose prose-invert max-w-none px-8 py-6 text-text leading-relaxed">
      {element}
    </article>
  )
}
