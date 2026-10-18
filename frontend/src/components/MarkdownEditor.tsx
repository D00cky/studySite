import { useId, useState, type ReactNode } from 'react'
import { Markdown } from './Markdown'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  rows?: number
  required?: boolean
  placeholder?: string
}

/** Campo de texto em Markdown com abas Escrever / Visualizar. */
export function MarkdownEditor({ label, value, onChange, hint, rows = 5, required, placeholder }: Props) {
  const id = useId()
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  return (
    <div className="field md-editor">
      <div className="md-editor-head">
        <label htmlFor={id}>{label}</label>
        <div role="tablist" aria-label="Modo do editor" className="md-tabs">
          <button type="button" role="tab" aria-selected={tab === 'write'} aria-controls={`${id}-write`} onClick={() => setTab('write')}>
            Escrever
          </button>
          <button type="button" role="tab" aria-selected={tab === 'preview'} aria-controls={`${id}-preview`} onClick={() => setTab('preview')}>
            Visualizar
          </button>
        </div>
      </div>
      <div id={`${id}-write`} role="tabpanel" hidden={tab !== 'write'}>
        <textarea
          id={id}
          rows={rows}
          required={required}
          placeholder={placeholder}
          value={value}
          aria-describedby={`${id}-hint`}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div id={`${id}-preview`} role="tabpanel" hidden={tab !== 'preview'} className="md-preview">
        {value.trim() ? <Markdown text={value} /> : <p className="muted small">Nada para visualizar ainda.</p>}
      </div>
      <p id={`${id}-hint`} className="hint">
        {hint ? <>{hint} </> : null}
        <span className="md-hint">Markdown: **negrito**, `código`, - listas, ```blocos```, [links](url)</span>
      </p>
    </div>
  )
}
