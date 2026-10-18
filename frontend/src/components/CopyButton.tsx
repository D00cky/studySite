import { useEffect, useState } from 'react'

/** Copia um texto para a área de transferência e confirma por 2 s ("Copiado"). */
export function CopyButton({ text, label = 'Copiar', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <button
      type="button"
      className={`copy-button ${className}`.trim()}
      data-copied={copied || undefined}
      aria-label={copied ? 'Copiado' : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
        } catch {
          // Sem permissão de clipboard (ex.: http sem localhost): o texto continua selecionável.
        }
      }}
    >
      {copied ? '✓ copiado' : 'copiar'}
    </button>
  )
}
