import { ApiError } from '../api/client'

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <p className="muted" role="status">
      {label}
    </p>
  )
}

export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null
  const message = error instanceof ApiError || error instanceof Error ? error.message : 'Algo deu errado.'
  return (
    <p className="error" role="alert">
      {message}
    </p>
  )
}
