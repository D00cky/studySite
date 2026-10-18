import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../api/client'

interface LoadingProps {
  label?: string
  /** lines = blocos de texto (padrão); cards = grade de cards. */
  variant?: 'lines' | 'cards'
  count?: number
}

/** Esqueleto animado no lugar do conteúdo; o texto fica só para leitores de tela. */
export function Loading({ label = 'Carregando…', variant = 'lines', count = 3 }: LoadingProps) {
  return (
    <div role="status" aria-label={label} className="loading-state">
      {variant === 'cards' ? (
        <div className="skeleton skeleton-grid" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="skeleton-card">
              <span className="skeleton-line short" />
              <span className="skeleton-line title" />
              <span className="skeleton-line" />
              <span className="skeleton-line" />
            </div>
          ))}
        </div>
      ) : (
        <div className="skeleton" aria-hidden="true">
          <span className="skeleton-line title" />
          {Array.from({ length: count }, (_, i) => (
            <span key={i} className="skeleton-line" />
          ))}
          <span className="skeleton-line short" />
        </div>
      )}
    </div>
  )
}

/** Estado vazio: diz o que falta e oferece a próxima ação, em vez de só "nada aqui". */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: { to: string; label: string }
}) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {children && <p className="empty-state-body">{children}</p>}
      {action && (
        <Link to={action.to} className="button button-secondary empty-state-action">
          {action.label}
        </Link>
      )}
    </div>
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
