import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import http from 'highlight.js/lib/languages/http'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import makefile from 'highlight.js/lib/languages/makefile'
import python from 'highlight.js/lib/languages/python'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import yaml from 'highlight.js/lib/languages/yaml'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { CopyButton } from './CopyButton'

// Só as linguagens que aparecem no currículo e nas evidências, para manter o bundle pequeno.
// Blocos sem linguagem ficam sem cor (sem detecção automática, que erra em saídas de terminal).
const HIGHLIGHT = {
  languages: { bash, c, diff, go, http, java, javascript, json, makefile, python, shell, sql, typescript, yaml },
  aliases: { bash: ['sh', 'zsh', 'fish'], c: ['h'], javascript: ['js'], typescript: ['ts', 'tsx'], python: ['py'], yaml: ['yml'] },
  detect: false,
}

interface HastNode {
  type: string
  tagName?: string
  value?: string
  properties?: { className?: string[] }
  children?: HastNode[]
}

/** Linguagem declarada no bloco (```c → "c"), lida da classe language-* do <code>. */
function languageOf(pre?: HastNode): string | undefined {
  const code = pre?.children?.find((c) => c.tagName === 'code')
  return code?.properties?.className?.find((c) => c.startsWith('language-'))?.slice('language-'.length)
}

function textOf(node?: HastNode): string {
  if (!node) return ''
  if (node.type === 'text') return node.value ?? ''
  return (node.children ?? []).map(textOf).join('')
}

/**
 * Markdown completo (GFM: títulos, listas, tabelas, tarefas, blocos de código).
 * Seguro por padrão: HTML do texto é escapado e URLs perigosas são removidas.
 */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, HIGHLIGHT]]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          pre: ({ node, ...props }) => (
            <div className="code-block">
              <div className="code-bar">
                <span className="code-lang">{languageOf(node as HastNode) ?? 'texto'}</span>
                <CopyButton text={textOf(node as HastNode).replace(/\n$/, '')} label="Copiar código" />
              </div>
              <pre {...props} />
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

/** Só a parte inline (código e negrito), para usar dentro de <li> ou <p>. */
export function InlineMarkdown({ text }: { text: string }) {
  return <>{inline(text)}</>
}

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return <code key={i}>{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**') && part.length > 3) return <strong key={i}>{part.slice(2, -2)}</strong>
    return part
  })
}
