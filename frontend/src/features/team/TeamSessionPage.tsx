import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import {
  useGroup,
  useMe,
  usePolicies,
  useSetContribution,
  useSetTeamRoles,
  useSuggestedRoles,
  useTeamSession,
  useUpdateTeamSession,
} from '../../api/queries'
import type { RoleAssignment, TeamSessionDetail } from '../../api/types'
import { Select } from '../../components/Field'
import { Markdown } from '../../components/Markdown'
import { MarkdownEditor } from '../../components/MarkdownEditor'
import { ErrorMessage, Loading } from '../../components/Status'
import { formatDateTime } from '../../lib/format'
import { SESSION_ROLE_LABEL } from '../../lib/labels'
import { useTopicTitles } from '../../lib/useTopicTitles'

export function TeamSessionPage() {
  const { sessionId = '' } = useParams()
  const { data, error, isPending } = useTeamSession(sessionId)
  const { data: me } = useMe()
  const { data: group } = useGroup(data?.session.groupId)
  const topicTitle = useTopicTitles()

  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  const { session, roles } = data
  const isMentor = group?.myRole === 'mentor'
  const isCreator = session.createdBy === me?.id
  const holdsRole = roles.some((r) => r.userId === me?.id)
  const canEdit = isCreator || isMentor || holdsRole

  return (
    <div className="prose">
      <p className="muted small">
        <Link to="/time">Time</Link> / Sessão
      </p>
      <h1>{session.title}</h1>
      <p className="muted small">
        {formatDateTime(session.scheduledFor ?? session.createdAt)}
        {session.topicId && (
          <>
            {' '}
            · <Link to={`/topicos/${session.topicId}`}>{topicTitle(session.topicId)}</Link>
          </>
        )}
      </p>
      {session.agenda && !canEdit && (
        <section aria-labelledby="agenda-title">
          <h2 id="agenda-title">Pauta</h2>
          <Markdown text={session.agenda} />
        </section>
      )}
      <Roles detail={data} myId={me?.id} canAssign={isCreator || isMentor} />
      {canEdit && <SessionRecord detail={data} />}
      {!canEdit && (session.findings || session.nextSteps) && (
        <section>
          <h2>Achados</h2>
          <Markdown text={session.findings} />
          <h2>Próximos passos</h2>
          <Markdown text={session.nextSteps} />
        </section>
      )}
    </div>
  )
}

function Roles({ detail, myId, canAssign }: { detail: TeamSessionDetail; myId?: string; canAssign: boolean }) {
  const { data: policies } = usePolicies()
  const { data: suggested = [] } = useSuggestedRoles(canAssign ? detail.session.groupId : undefined)
  const { data: group } = useGroup(detail.session.groupId)
  const setRoles = useSetTeamRoles()
  const nameOf = (id: string) => group?.members.find((m) => m.userId === id)?.displayName ?? id

  return (
    <section className="panel stack" aria-labelledby="roles-title">
      <h2 id="roles-title">Papéis</h2>
      {policies && (
        <p className="hint">Cada participante implementa ou investiga algo e explica a própria contribuição.</p>
      )}
      {detail.roles.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Papéis ainda não distribuídos.
        </p>
      ) : (
        <ul className="list-plain">
          {detail.roles.map((r) => (
            <li key={`${r.userId}-${r.role}`}>
              <div className="row">
                <strong>{SESSION_ROLE_LABEL[r.role]}</strong>
                <span>{r.displayName}</span>
              </div>
              {policies && (
                <p className="hint">{policies.sessionRoles.find((p) => p.id === r.role)?.description}</p>
              )}
              {r.userId === myId ? (
                <ContributionForm sessionId={detail.session.id} assignment={r} />
              ) : (
                r.contribution && <Markdown text={r.contribution} />
              )}
            </li>
          ))}
        </ul>
      )}
      {canAssign && group && <ManualRoles detail={detail} members={group.members} />}
      {canAssign && suggested.length > 0 && (
        <div className="stack">
          <p className="small" style={{ margin: 0 }}>
            Rotação sugerida:{' '}
            {suggested.map((s) => `${SESSION_ROLE_LABEL[s.role as RoleAssignment['role']]}: ${nameOf(s.userId)}`).join(' · ')}
          </p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setRoles.mutate({ id: detail.session.id, body: suggested })}
            disabled={setRoles.isPending}
          >
            Usar rotação sugerida
          </button>
        </div>
      )}
      <ErrorMessage error={setRoles.error} />
    </section>
  )
}

const ROLE_IDS: RoleAssignment['role'][] = ['author', 'challenger', 'reviewer', 'synthesizer']

/** Distribuição manual: uma pessoa por papel (papéis vazios ficam sem ninguém). */
function ManualRoles({ detail, members }: { detail: TeamSessionDetail; members: { userId: string; displayName: string }[] }) {
  const setRoles = useSetTeamRoles()
  const initial = Object.fromEntries(ROLE_IDS.map((r) => [r, detail.roles.find((a) => a.role === r)?.userId ?? '']))
  const [choice, setChoice] = useState<Record<string, string>>(initial)

  function submit(e: FormEvent) {
    e.preventDefault()
    setRoles.mutate({
      id: detail.session.id,
      body: ROLE_IDS.filter((r) => choice[r]).map((r) => ({ userId: choice[r]!, role: r })),
    })
  }

  return (
    <details>
      <summary>Distribuir papéis manualmente</summary>
      <form onSubmit={submit} className="stack details-body" aria-label="Distribuir papéis">
        <div className="filters filters-plain">
          {ROLE_IDS.map((r) => (
            <Select key={r} label={SESSION_ROLE_LABEL[r]} value={choice[r]} onChange={(e) => setChoice({ ...choice, [r]: e.target.value })}>
              <option value="">Ninguém</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName}
                </option>
              ))}
            </Select>
          ))}
        </div>
        <ErrorMessage error={setRoles.error} />
        <button type="submit" className="button-secondary" disabled={setRoles.isPending}>
          Salvar papéis
        </button>
      </form>
    </details>
  )
}

function ContributionForm({ sessionId, assignment }: { sessionId: string; assignment: RoleAssignment }) {
  const save = useSetContribution()
  const [text, setText] = useState(assignment.contribution)
  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate({ id: sessionId, body: { role: assignment.role, contribution: text } })
  }
  return (
    <form onSubmit={submit} className="stack" style={{ marginTop: '0.4rem' }}>
      <MarkdownEditor
        label={`Sua contribuição como ${SESSION_ROLE_LABEL[assignment.role]}`}
        rows={4}
        value={text}
        onChange={setText}
      />
      <ErrorMessage error={save.error} />
      <button type="submit" className="button-quiet" disabled={save.isPending}>
        Salvar contribuição
      </button>
      {save.isSuccess && <p className="success small">Contribuição salva.</p>}
    </form>
  )
}

function SessionRecord({ detail }: { detail: TeamSessionDetail }) {
  const update = useUpdateTeamSession()
  const [form, setForm] = useState({
    agenda: detail.session.agenda,
    findings: detail.session.findings,
    nextSteps: detail.session.nextSteps,
  })
  function submit(e: FormEvent) {
    e.preventDefault()
    update.mutate({ id: detail.session.id, body: form })
  }
  return (
    <form onSubmit={submit} className="panel stack" aria-labelledby="record-title" style={{ marginTop: '1rem' }}>
      <h2 id="record-title">Registro da sessão</h2>
      <MarkdownEditor label="Pauta" rows={3} value={form.agenda} onChange={(agenda) => setForm({ ...form, agenda })} />
      <MarkdownEditor
        label="Achados"
        rows={6}
        hint="O que a evidência mostrou? Que casos-limite quebraram algo?"
        value={form.findings}
        onChange={(findings) => setForm({ ...form, findings })}
      />
      <MarkdownEditor label="Próximos passos" rows={3} value={form.nextSteps} onChange={(nextSteps) => setForm({ ...form, nextSteps })} />
      <ErrorMessage error={update.error} />
      <button type="submit" disabled={update.isPending}>
        Salvar registro da sessão
      </button>
      {update.isSuccess && <p className="success small">Registro salvo.</p>}
    </form>
  )
}
