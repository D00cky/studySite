import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

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

export function TextArea({ label, hint, ...textarea }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={4} aria-describedby={hint ? `${id}-hint` : undefined} {...textarea} />
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
