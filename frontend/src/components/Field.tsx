import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface FieldProps {
  label: string
  hint?: ReactNode
}

interface TextFieldProps extends FieldProps {
  /** Prefixo visual (ex.: prompt "❯" na busca); decorativo, fora do nome acessível. */
  prefix?: string
}

/** Campo com label associado e dica opcional ligada por aria-describedby. */
export function TextField({ label, hint, prefix, ...input }: TextFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const control = <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {prefix ? (
        <div className="control-prefixed">
          <span className="control-prefix" aria-hidden="true">
            {prefix}
          </span>
          {control}
        </div>
      ) : (
        control
      )}
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
    </div>
  )
}

/** Linha de status do editor: linha atual (total) e caracteres, como no rodapé de uma IDE. */
export function EditorStatus({ text, children }: { text: string; children?: ReactNode }) {
  const lines = text.split('\n').length
  const chars = text.length
  return (
    <div className="editor-status">
      {children}
      <span className="editor-count">
        Ln {lines} · {chars} {chars === 1 ? 'caractere' : 'caracteres'}
      </span>
    </div>
  )
}

/** Área de texto em "janela de editor": cresce com o conteúdo e mostra linhas e caracteres. */
export function TextArea({ label, hint, onChange, ...textarea }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  const [typed, setTyped] = useState(String(textarea.defaultValue ?? ''))
  const text = textarea.value !== undefined ? String(textarea.value) : typed
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="editor-frame">
        <textarea
          id={id}
          rows={3}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            setTyped(e.target.value)
            onChange?.(e)
          }}
          {...textarea}
        />
        <EditorStatus text={text} />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
    </div>
  )
}

export function Select({
  label,
  hint,
  children,
  ...select
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...select}>
        {children}
      </select>
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
    </div>
  )
}
