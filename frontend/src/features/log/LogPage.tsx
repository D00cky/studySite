import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  useAttempts,
  useCreateNote,
  useMe,
  useMyAssessments,
  useMyEvidence,
  useMyNotes,
  useMyResourceEvents,
  useResources,
  usePolicies,
  useSessions,
  useUpdateNote,
  useUpdateProfile,
} from '../../api/queries'
import type { Note } from '../../api/types'
import { Select, TextArea, TextField } from '../../components/Field'
import { ErrorMessage } from '../../components/Status'
import { formatDateTime } from '../../lib/format'
import { useTopicTitles } from '../../lib/useTopicTitles'

const ATTEMPT_STATUS = { in_progress: 'Em andamento', submitted: 'Enviada', abandoned: 'Abandonada' } as const
const MODE_LABEL: Record<string, string> = {
  survival: 'Sobrevivência',
  compact: 'Compacto',
  standard: 'Padrão',
  expansion: 'Expansão',
  rescue: 'Resgate',
}

export function LogPage() {
  return (
    <>
      <h1>Meu registro</h1>
      <p className="prose muted">
        Seus registros pessoais, cada tipo separado. Só você vê o que é privado — nem mentores. O que você compartilha
        aparece para o grupo.
      </p>
      <div className="two-col">
        <div className="stack">
          <Sessions />
          <Attempts />
          <EvidenceList />
          <Assessments />
          <ResourceEvents />
        </div>
        <aside className="stack" aria-label="Notas e preferências">
          <Notes />
          <WeeklyMode />
        </aside>
      </div>
    </>
  )
}

function Section({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="muted small" style={{ margin: 0 }}>
      {children}
    </p>
  )
}

function Sessions() {
  const { data = [] } = useSessions()
  const topicTitle = useTopicTitles()
  return (
    <Section title="Sessões de estudo" id="log-sessions">
      {data.length === 0 ? (
        <Empty>Nenhuma sessão ainda.</Empty>
      ) : (
        <ul className="list-plain">
          {data.map((s) => (
            <li key={s.id}>
              <div className="row small">
                <strong>{formatDateTime(s.startedAt)}</strong>
                <span className="tag">{MODE_LABEL[s.mode]}</span>
                {s.topicId && <Link to={`/topicos/${s.topicId}`}>{topicTitle(s.topicId)}</Link>}
                {!s.endedAt && <span className="tag tag-accent">Em andamento</span>}
              </div>
              {s.summary && <p style={{ margin: '0.3rem 0 0' }}>{s.summary}</p>}
              {s.restartNote && (
                <p className="small" style={{ margin: '0.3rem 0 0' }}>
                  <span className="muted">Nota de retomada:</span> {s.restartNote}
                </p>
              )}
              {s.nextAction && (
                <p className="small" style={{ margin: '0.2rem 0 0' }}>
                  <span className="muted">Próxima ação:</span> {s.nextAction}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Attempts() {
  const { data = [] } = useAttempts()
  const topicTitle = useTopicTitles()
  return (
    <Section title="Tentativas de exercício" id="log-attempts">
      {data.length === 0 ? (
        <Empty>Nenhuma tentativa ainda.</Empty>
      ) : (
        <ul className="list-plain">
          {data.map((a) => (
            <li key={a.id}>
              <div className="row small">
                <Link to={`/topicos/${a.topicId}`}>{topicTitle(a.topicId)}</Link>
                <span className="tag">{ATTEMPT_STATUS[a.status]}</span>
                <span className="muted">{formatDateTime(a.updatedAt)}</span>
              </div>
              {a.prediction && <p className="small" style={{ margin: '0.3rem 0 0' }}>Previsão: {a.prediction}</p>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function EvidenceList() {
  const { data = [] } = useMyEvidence()
  const topicTitle = useTopicTitles()
  return (
    <Section title="Evidências" id="log-evidence">
      {data.length === 0 ? (
        <Empty>Nenhuma evidência ainda.</Empty>
      ) : (
        <ul className="list-plain">
          {data.map((e) => (
            <li key={e.id}>
              <div className="row">
                <strong>{e.title}</strong>
                <span className="tag">{e.visibility === 'group' ? 'Compartilhada' : 'Privada'}</span>
              </div>
              <div className="muted small">
                {e.topicId && <Link to={`/topicos/${e.topicId}`}>{topicTitle(e.topicId)}</Link>}
                {e.projectId && <> · projeto {e.projectId}</>} · {formatDateTime(e.updatedAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Assessments() {
  const { data = [] } = useMyAssessments()
  const { data: policies } = usePolicies()
  const topicTitle = useTopicTitles()
  return (
    <Section title="Autoavaliações" id="log-assessments">
      {data.length === 0 ? (
        <Empty>Nenhuma autoavaliação ainda.</Empty>
      ) : (
        <ul className="list-plain">
          {data.map((a) => (
            <li key={a.id} className="small">
              {topicTitle(a.topicId)}: {a.level} — {policies?.selfAssessmentLevels.find((l) => l.level === a.level)?.title}
              <span className="muted"> · {formatDateTime(a.createdAt)}</span>
              {a.note && <div>{a.note}</div>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function ResourceEvents() {
  const { data = [] } = useMyResourceEvents()
  const { data: resources = [] } = useResources({})
  const topicTitle = useTopicTitles()
  const resourceTitle = (id: string) => resources.find((r) => r.id === id)?.title ?? id
  return (
    <Section title="Recursos consultados" id="log-resources">
      <p className="hint">Consumo de recurso fica registrado, mas não demonstra domínio.</p>
      {data.length === 0 ? (
        <Empty>Nenhum recurso registrado ainda.</Empty>
      ) : (
        <ul className="list-plain">
          {data.map((r) => (
            <li key={r.id} className="small">
              {r.kind === 'opened' ? 'Abriu' : 'Leu'} <strong>{resourceTitle(r.resourceId)}</strong>
              {r.topicId && <> em {topicTitle(r.topicId)}</>}
              <span className="muted"> · {formatDateTime(r.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Notes() {
  const { data: notes = [] } = useMyNotes()
  const { data: me } = useMe()
  const create = useCreateNote()
  const update = useUpdateNote()
  const group = me?.groups[0]
  const [form, setForm] = useState({ title: '', body: '' })

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate({ title: form.title, ...(form.body ? { body: form.body } : {}), visibility: 'private' }, { onSuccess: () => setForm({ title: '', body: '' }) })
  }

  const toggle = (n: Note) =>
    update.mutate(n.visibility === 'group' ? { id: n.id, visibility: 'private' } : { id: n.id, visibility: 'group', groupId: group!.id })

  return (
    <section className="panel stack" aria-labelledby="log-notes">
      <h2 id="log-notes">Notas</h2>
      {notes.length > 0 && (
        <ul className="list-plain">
          {notes.map((n) => (
            <li key={n.id}>
              <div className="row">
                <strong>{n.title}</strong>
                <span className="tag">{n.visibility === 'group' ? 'Compartilhada' : 'Privada'}</span>
              </div>
              {n.body && <p className="small" style={{ margin: '0.3rem 0', whiteSpace: 'pre-wrap' }}>{n.body}</p>}
              {group && (
                <button type="button" className="button-quiet" onClick={() => toggle(n)}>
                  {n.visibility === 'group' ? 'Tornar privada' : `Compartilhar com ${group.name}`}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="stack">
        <TextField label="Título da nota" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <TextArea label="Texto" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <ErrorMessage error={create.error ?? update.error} />
        <button type="submit" className="button-secondary" disabled={create.isPending}>
          Salvar nota
        </button>
        <p className="hint">Notas novas são privadas.</p>
      </form>
    </section>
  )
}

function WeeklyMode() {
  const { data: me } = useMe()
  const { data: policies } = usePolicies()
  const update = useUpdateProfile()
  const [mode, setMode] = useState<string | undefined>()
  if (!me || !policies) return null
  const selected = mode ?? me.weeklyMode
  return (
    <form
      className="panel stack"
      onSubmit={(e) => {
        e.preventDefault()
        update.mutate({ weeklyMode: selected })
      }}
      aria-labelledby="weekly-title"
    >
      <h2 id="weekly-title">Ritmo</h2>
      <Select label="Ritmo semanal" value={selected} onChange={(e) => setMode(e.target.value)}>
        {policies.weeklyModes
          .filter((m) => m.id !== 'rescue')
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.title} — {m.time}
            </option>
          ))}
      </Select>
      <p className="hint">Sem sequências, sem horas acumuladas. Mudar o ritmo não reinicia nada.</p>
      <ErrorMessage error={update.error} />
      <button type="submit" className="button-secondary" disabled={update.isPending}>
        Salvar ritmo
      </button>
      {update.isSuccess && <p className="success small">Ritmo atualizado.</p>}
    </form>
  )
}
