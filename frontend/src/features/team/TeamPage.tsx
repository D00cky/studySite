import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  useCreateGroup,
  useCreateTeamSession,
  useGroup,
  useGroupProgress,
  useGroupProjects,
  useGroupSessions,
  useGroupSuggestions,
  useJoinGroup,
  useMe,
  useMyReviews,
  useProjects,
  useReviewSuggestion,
  useStartGroupProject,
} from '../../api/queries'
import type { GroupDetail } from '../../api/types'
import { Select, TextArea, TextField } from '../../components/Field'
import { ProgressTag } from '../../components/ProgressTag'
import { EmptyState, ErrorMessage, Loading } from '../../components/Status'
import { formatDateTime, plural } from '../../lib/format'
import { ROLE_LABEL } from '../../lib/labels'
import { useTopicTitles } from '../../lib/useTopicTitles'
import { SignalsSection } from './SignalsSection'

export function TeamPage() {
  const { data: me } = useMe()
  const [params, setParams] = useSearchParams()
  const groups = me?.groups ?? []
  const groupId = params.get('grupo') ?? groups[0]?.id
  const { data: group, error, isPending } = useGroup(groupId)

  if (!me) return <Loading />
  if (groups.length === 0) return <NoGroup />

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Time: {group?.name ?? '…'}</h1>
        {groups.length > 1 && (
          <div style={{ minWidth: '14rem' }}>
            <Select label="Grupo" value={groupId} onChange={(e) => setParams({ grupo: e.target.value })}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {isPending && <Loading />}
      <ErrorMessage error={error} />
      {group && (
        <div className="two-col">
          <div className="stack">
            <SignalsSummary group={group} />
            <ReviewQueue groupId={group.id} />
            <SignalsSection group={group} />
            <TeamSessions groupId={group.id} />
            <GroupProjects groupId={group.id} />
            <SharedProgress groupId={group.id} />
          </div>
          <aside className="stack" aria-label="Grupo">
            <Members group={group} />
            <Suggestions group={group} />
            <JoinOrCreate compact />
          </aside>
        </div>
      )}
    </>
  )
}

function SignalsSummary({ group }: { group: GroupDetail }) {
  const s = group.signals
  return (
    <section className="callout" aria-labelledby="signals-summary-title">
      <h2 id="signals-summary-title" className="visually-hidden">
        Sinais do time
      </h2>
      <p style={{ margin: 0 }}>
        {plural(s.openReviews, 'revisão aberta', 'revisões abertas')} · {plural(s.openBlockers, 'bloqueio', 'bloqueios')} ·{' '}
        {plural(s.wantHelp, 'pedido de ajuda', 'pedidos de ajuda')} · {plural(s.canHelp, 'oferta de ajuda', 'ofertas de ajuda')}
      </p>
    </section>
  )
}

function ReviewQueue({ groupId }: { groupId: string }) {
  const { data } = useMyReviews()
  const topicTitle = useTopicTitles()
  const toReview = data?.toReview.filter((r) => r.groupId === groupId) ?? []
  return (
    <section className="panel" aria-labelledby="queue-title">
      <h2 id="queue-title">Revisões esperando por você</h2>
      {toReview.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Nada pendente.
        </p>
      ) : (
        <ul className="list-plain">
          {toReview.map((r) => (
            <li key={r.id}>
              <Link to={`/revisoes/${r.id}`}>{r.evidenceTitle}</Link>
              <div className="muted small">
                {r.requesterName}
                {r.topicId && <> · {topicTitle(r.topicId)}</>}
                {r.reviewerName && <> · assumida por {r.reviewerName}</>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function TeamSessions({ groupId }: { groupId: string }) {
  const { data: sessions = [] } = useGroupSessions(groupId)
  const create = useCreateTeamSession(groupId)
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [agenda, setAgenda] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate({ title, ...(agenda ? { agenda } : {}) }, { onSuccess: (d) => navigate(`/sessoes/${d.session.id}`) })
  }

  return (
    <section className="panel stack" aria-labelledby="sessions-title">
      <h2 id="sessions-title">Sessões do time</h2>
      {sessions.length === 0 && (
        <EmptyState title="Nenhuma sessão ainda">
          Rotação de papéis: autor(a), desafiante, revisor(a), sintetizador(a). Marque a primeira abaixo.
        </EmptyState>
      )}
      {sessions.length > 0 && (
        <ul className="list-plain">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link to={`/sessoes/${s.id}`}>{s.title}</Link>
              <span className="muted small"> · {formatDateTime(s.scheduledFor ?? s.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary>Nova sessão</summary>
      <form onSubmit={submit} className="stack details-body">
        <TextField label="Título da sessão" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextArea label="Pauta (opcional)" placeholder="Ex.: revisar as evidências de pipes" rows={2} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
        <ErrorMessage error={create.error} />
        <button type="submit" className="button-secondary" disabled={create.isPending}>
          Criar sessão
        </button>
      </form>
      </details>
    </section>
  )
}

function GroupProjects({ groupId }: { groupId: string }) {
  const { data: started = [] } = useGroupProjects(groupId)
  const { data: catalog = [] } = useProjects()
  const start = useStartGroupProject(groupId)
  const available = catalog.filter((p) => !started.some((s) => s.project.id === p.id))
  const [projectId, setProjectId] = useState('')

  return (
    <section className="panel stack" aria-labelledby="group-projects-title">
      <h2 id="group-projects-title">Projetos do grupo</h2>
      {started.length > 0 && (
        <ul className="list-plain">
          {started.map((gp) => {
            const done = gp.milestones.filter((m) => m.status === 'done').length
            return (
              <li key={gp.groupProject.id}>
                <Link to={`/projetos-do-grupo/${gp.groupProject.id}`}>{gp.project.title}</Link>
                <span className="muted small">
                  {' '}
                  · {done}/{gp.project.milestones.length} marcos · {plural(gp.contributions.length, 'contribuição', 'contribuições')}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {available.length > 0 && (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (projectId) start.mutate({ projectId })
          }}
        >
          <div style={{ flex: 1, minWidth: '12rem' }}>
            <Select label="Começar projeto" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Escolha…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </div>
          <button type="submit" className="button-secondary" disabled={!projectId || start.isPending} style={{ alignSelf: 'flex-end' }}>
            Começar
          </button>
        </form>
      )}
      <ErrorMessage error={start.error} />
    </section>
  )
}

function SharedProgress({ groupId }: { groupId: string }) {
  const { data: members = [] } = useGroupProgress(groupId)
  const topicTitle = useTopicTitles()
  return (
    <section className="panel" aria-labelledby="shared-progress-title">
      <h2 id="shared-progress-title">Progresso compartilhado</h2>
      <p className="hint">
        Mostra só evidências compartilhadas, revisões aprovadas e autoavaliações. Cada pessoa tem seu próprio progresso;
        trabalho em grupo não marca ninguém como proficiente.
      </p>
      <ul className="list-plain">
        {members.map((m) => {
          const topics = Object.values(m.topics).filter((t) => t.status !== 'not_started')
          return (
            <li key={m.userId}>
              <h3 style={{ margin: 0 }}>{m.displayName}</h3>
              {topics.length === 0 ? (
                <p className="muted small" style={{ margin: 0 }}>
                  Nada compartilhado ainda.
                </p>
              ) : (
                <ul className="small">
                  {topics.map((t) => (
                    <li key={t.topicId}>
                      {topicTitle(t.topicId)} <ProgressTag status={t.status} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Members({ group }: { group: GroupDetail }) {
  return (
    <section className="panel" aria-labelledby="members-title">
      <h2 id="members-title">Membros</h2>
      <ul className="list-plain">
        {group.members.map((m) => (
          <li key={m.userId} className="row" style={{ justifyContent: 'space-between' }}>
            <span>{m.displayName}</span>
            <span className="muted small">{ROLE_LABEL[m.role]}</span>
          </li>
        ))}
      </ul>
      {group.inviteCode && (
        <p className="small" style={{ marginTop: '0.75rem' }}>
          Código de convite: <code>{group.inviteCode}</code>
        </p>
      )}
    </section>
  )
}

function Suggestions({ group }: { group: GroupDetail }) {
  const { data: suggestions = [] } = useGroupSuggestions(group.id)
  const review = useReviewSuggestion()
  const pending = suggestions.filter((s) => s.status === 'pending')
  if (pending.length === 0) return null
  return (
    <section className="panel" aria-labelledby="suggestions-title">
      <h2 id="suggestions-title">Sugestões de recursos</h2>
      <ul className="list-plain">
        {pending.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
            </a>
            <div className="muted small">
              {s.suggestedByName}
              {s.rationale && <> — {s.rationale}</>}
            </div>
            {group.myRole === 'mentor' && (
              <div className="row" style={{ marginTop: '0.4rem' }}>
                <button type="button" className="button-quiet" onClick={() => review.mutate({ id: s.id, status: 'accepted' })}>
                  Aceitar
                </button>
                <button type="button" className="button-quiet" onClick={() => review.mutate({ id: s.id, status: 'rejected' })}>
                  Recusar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {group.myRole === 'mentor' && (
        <p className="hint">Aceitar não publica o recurso: verifique o link e adicione-o em content/resources.yaml.</p>
      )}
      <ErrorMessage error={review.error} />
    </section>
  )
}

function NoGroup() {
  return (
    <div className="prose">
      <h1>Time</h1>
      <p>Você ainda não participa de um grupo. Crie um (você será mentor/a) ou entre com um código de convite.</p>
      <JoinOrCreate />
    </div>
  )
}

function JoinOrCreate({ compact = false }: { compact?: boolean }) {
  const join = useJoinGroup()
  const create = useCreateGroup()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const content = (
    <div className="stack">
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          join.mutate({ inviteCode: code }, { onSuccess: () => setCode('') })
        }}
      >
        <TextField label="Código de convite" required value={code} onChange={(e) => setCode(e.target.value)} />
        <ErrorMessage error={join.error} />
        <button type="submit" disabled={join.isPending}>
          Entrar no grupo
        </button>
      </form>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate({ name }, { onSuccess: () => setName('') })
        }}
      >
        <TextField label="Nome do grupo" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        <ErrorMessage error={create.error} />
        <button type="submit" className="button-secondary" disabled={create.isPending}>
          Criar grupo
        </button>
      </form>
    </div>
  )
  return compact ? (
    <details>
      <summary>Outro grupo</summary>
      <div className="details-body">{content}</div>
    </details>
  ) : (
    content
  )
}
