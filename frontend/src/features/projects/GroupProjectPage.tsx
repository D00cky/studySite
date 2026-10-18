import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useCreateEvidence, useGroupProject, useSetMilestone } from '../../api/queries'
import type { Evidence, GroupProjectDetail, MilestoneStatus } from '../../api/types'
import { Select, TextArea, TextField } from '../../components/Field'
import { MarkdownEditor } from '../../components/MarkdownEditor'
import { ErrorMessage, Loading } from '../../components/Status'

const STATUS_LABEL: Record<MilestoneStatus['status'], string> = { todo: 'A fazer', in_progress: 'Em andamento', done: 'Concluído' }

export function GroupProjectPage() {
  const { groupProjectId = '' } = useParams()
  const { data, error, isPending } = useGroupProject(groupProjectId)
  const setMilestone = useSetMilestone()
  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  const { project, milestones, contributions, groupProject } = data
  const statusOf = (id: string) => milestones.find((m) => m.milestoneId === id)?.status ?? 'todo'

  return (
    <div className="prose">
      <p className="muted small">
        <Link to="/time">Time</Link> / Projeto do grupo
      </p>
      <h1>{project.title}</h1>
      <p className="callout">
        Os marcos são compartilhados. Concluir um marco do grupo não marca ninguém como proficiente: cada pessoa registra a
        própria contribuição e a explica na revisão. <Link to={`/projetos/${project.id}`}>Ver o projeto completo</Link>.
      </p>
      <section aria-labelledby="gp-milestones">
        <h2 id="gp-milestones">Marcos</h2>
        <ul className="list-plain">
          {project.milestones.map((m) => (
            <li key={m.id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                <strong>{m.title}</strong>
                {m.minutes && <span className="muted small"> · ~{m.minutes} min</span>}
              </span>
              <label className="visually-hidden" htmlFor={`ms-${m.id}`}>
                Status de {m.title}
              </label>
              <select
                id={`ms-${m.id}`}
                style={{ width: 'auto' }}
                value={statusOf(m.id)}
                onChange={(e) => setMilestone.mutate({ id: groupProject.id, milestoneId: m.id, status: e.target.value })}
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        <ErrorMessage error={setMilestone.error} />
      </section>
      <section aria-labelledby="gp-contributions">
        <h2 id="gp-contributions">Contribuições</h2>
        {contributions.length === 0 ? (
          <p className="muted">Ninguém registrou contribuição ainda.</p>
        ) : (
          <ul className="list-plain">
            {contributions.map((c) => (
              <li key={c.id}>
                <strong>{c.title}</strong>
                <div className="muted small">
                  {c.authorName}
                  {c.milestoneId && <> · {project.milestones.find((m) => m.id === c.milestoneId)?.title}</>}
                </div>
                {c.url && (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="small">
                    {c.url}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <ContributionForm detail={data} />
    </div>
  )
}

function ContributionForm({ detail }: { detail: GroupProjectDetail }) {
  const create = useCreateEvidence()
  const empty = { milestoneId: '', title: '', kind: 'text' as Evidence['kind'], url: '', body: '', aiAssistance: '' }
  const [form, setForm] = useState(empty)

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate(
      {
        projectId: detail.project.id,
        ...(form.milestoneId ? { milestoneId: form.milestoneId } : {}),
        groupId: detail.groupProject.groupId,
        visibility: 'group',
        kind: form.kind,
        title: form.title,
        ...(form.kind !== 'text' ? { url: form.url } : {}),
        ...(form.body ? { body: form.body } : {}),
        ...(form.aiAssistance ? { aiAssistance: form.aiAssistance } : {}),
      },
      { onSuccess: () => setForm(empty) },
    )
  }

  return (
    <form onSubmit={submit} className="panel stack" aria-label="Registrar minha contribuição" style={{ marginTop: '1.5rem' }}>
      <h2 style={{ margin: 0 }}>Registrar minha contribuição</h2>
      <Select label="Marco" value={form.milestoneId} onChange={(e) => setForm({ ...form, milestoneId: e.target.value })}>
        <option value="">Nenhum específico</option>
        {detail.project.milestones.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </Select>
      <TextField label="Título" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <Select label="Tipo" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Evidence['kind'] })}>
        <option value="text">Texto</option>
        <option value="repository">Repositório</option>
        <option value="artifact">Artefato (link)</option>
      </Select>
      {form.kind !== 'text' && (
        <TextField label="Link" type="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      )}
      <MarkdownEditor label="O que você fez e o que observou" placeholder="O que você implementou, o que quebrou e a saída que comprova" rows={5} value={form.body} onChange={(body) => setForm({ ...form, body })} />
      <TextArea label="Assistência de IA (se houve)" placeholder="Ex.: pedi uma revisão do parser" rows={2} value={form.aiAssistance} onChange={(e) => setForm({ ...form, aiAssistance: e.target.value })} />
      <ErrorMessage error={create.error} />
      <button type="submit" disabled={create.isPending}>
        Registrar contribuição
      </button>
      {create.isSuccess && <p className="success small">Contribuição registrada.</p>}
    </form>
  )
}
