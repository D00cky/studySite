import type { Resource } from '../api/types'
import { formatDate } from '../lib/format'
import { ACCESS_LABEL, DIFFICULTY_LABEL, FORMAT_LABEL } from '../lib/labels'


export function VerificationNote({ resource }: { resource: Resource }) {
  const v = resource.verification
  return v.status === 'verified' ? (
    <p className="muted small" style={{ margin: 0 }}>
      Link verificado em {formatDate(v.checkedOn)}
      {v.note && <> — {v.note}</>}
    </p>
  ) : (
    <p className="small" style={{ margin: 0 }}>
      <span className="tag tag-warning">Aguardando verificação</span> {v.note}
    </p>
  )
}

/** Dados de um recurso: o que é, por que usar, onde ler e se o link foi verificado. */
export function ResourceDetails({ resource, onOpen }: { resource: Resource; onOpen?: () => void }) {
  return (
    <div className="stack">
      <div>
        <strong>{resource.title}</strong>
        <div className="muted small">
          {resource.author} · {FORMAT_LABEL[resource.format]} · {resource.language === 'pt-BR' ? 'Português' : 'Inglês'} ·{' '}
          {DIFFICULTY_LABEL[resource.difficulty]} · {ACCESS_LABEL[resource.access]}
        </div>
      </div>
      <p style={{ margin: 0 }}>{resource.why}</p>
      {resource.section && (
        <p className="small" style={{ margin: 0 }}>
          <span className="muted">Onde ler:</span> {resource.section}
        </p>
      )}
      <VerificationNote resource={resource} />
      <p style={{ margin: 0 }}>
        <a href={resource.url} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
          Abrir recurso<span className="visually-hidden"> (abre em nova aba)</span>
        </a>
      </p>
    </div>
  )
}
