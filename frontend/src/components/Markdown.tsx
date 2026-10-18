import type { ReactNode } from 'react'

/**
 * Subconjunto de markdown usado no conteúdo: parágrafos, listas (- e 1.), `código` e
 * **negrito**. Gera elementos React — nunca HTML bruto.
 */
export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/)
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim())
        if (lines.every((l) => /^- /.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          )
        }
        if (lines.every((l) => /^\d+\. /.test(l))) {
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\. /, ''))}</li>
              ))}
            </ol>
          )
        }
        // Parágrafo seguido de lista no mesmo bloco (ex.: "Os erros clássicos:\n- ...").
        const firstItem = lines.findIndex((l) => /^- /.test(l))
        if (firstItem > 0 && lines.slice(firstItem).every((l) => /^- /.test(l))) {
          return (
            <div key={i}>
              <p>{inline(lines.slice(0, firstItem).join(' '))}</p>
              <ul>
                {lines.slice(firstItem).map((l, j) => (
                  <li key={j}>{inline(l.slice(2))}</li>
                ))}
              </ul>
            </div>
          )
        }
        return <p key={i}>{inline(lines.join(' '))}</p>
      })}
    </>
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
