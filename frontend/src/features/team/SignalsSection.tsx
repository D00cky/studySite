import { useState, type FormEvent } from 'react'
import { useAddSignal, useGroupSignals, useMe, useResolveSignal } from '../../api/queries'
import type { GroupDetail, HelpSignal } from '../../api/types'
import { Select, TextArea } from '../../components/Field'
import { EmptyState, ErrorMessage } from '../../components/Status'
import { formatDateTime } from '../../lib/format'
import { useTopicTitles } from '../../lib/useTopicTitles'

const KIND_LABEL: Record<HelpSignal['kind'], string> = {
  blocker: 'Bloqueio',
  want_help: 'Quero ajuda',
  can_help: 'Posso ajudar',
}

export function SignalsSection({ group }: { group: GroupDetail }) {
  const { data: me } = useMe()
  const { data: signals = [] } = useGroupSignals(group.id)
  const add = useAddSignal(group.id)
  const resolve = useResolveSignal()
  const topicTitle = useTopicTitles()
  const [kind, setKind] = useState<HelpSignal['kind']>('blocker')
  const [body, setBody] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    add.mutate({ kind, body }, { onSuccess: () => setBody('') })
  }

  return (
    <section className="panel stack" aria-labelledby="help-title">
      <h2 id="help-title">Bloqueios e pedidos de ajuda</h2>
      {signals.length > 0 ? (
        <ul className="list-plain">
          {signals.map((s) => (
            <li key={s.id}>
              <div className="row small">
                <span className={`tag ${s.kind === 'blocker' ? 'tag-danger' : 'tag-accent'}`}>{KIND_LABEL[s.kind]}</span>
                <strong>{s.displayName}</strong>
                {s.topicId && <span className="muted">{topicTitle(s.topicId)}</span>}
                <span className="muted">{formatDateTime(s.createdAt)}</span>
              </div>
              <p style={{ margin: '0.3rem 0' }}>{s.body}</p>
              {(s.userId === me?.id || group.myRole === 'mentor') && (
                <button type="button" className="button-quiet" onClick={() => resolve.mutate(s.id)}>
                  Marcar como resolvido
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nenhum sinal aberto">Travou em algo ou pode ajudar alguém? Avise o time abaixo.</EmptyState>
      )}
      <details>
        <summary>Abrir um sinal</summary>
      <form onSubmit={submit} className="stack details-body">
        <Select label="Tipo de sinal" value={kind} onChange={(e) => setKind(e.target.value as HelpSignal['kind'])}>
          {Object.entries(KIND_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <TextArea label="Descreva" placeholder="Ex.: travado no exercício de pipes; o filho não termina" required rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
        <ErrorMessage error={add.error ?? resolve.error} />
        <button type="submit" className="button-secondary" disabled={add.isPending}>
          Enviar sinal
        </button>
      </form>
      </details>
    </section>
  )
}
