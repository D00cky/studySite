import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useCreateEvidence, useMe, useRequestReview } from '../../api/queries'
import type { Evidence, Topic, TopicWorkspace } from '../../api/types'
import { Select, TextArea, TextField } from '../../components/Field'
import { MarkdownEditor } from '../../components/MarkdownEditor'
import { EmptyState, ErrorMessage } from '../../components/Status'

const KIND_LABEL: Record<Evidence['kind'], string> = { text: 'Texto', repository: 'Repositório', artifact: 'Artefato (link)' }

export function EvidencePanel({ topic, workspace }: { topic: Topic; workspace: TopicWorkspace }) {
  const activeAttempt = workspace.attempts.find((a) => a.status === 'in_progress')
  return (
    <section className="panel stack" aria-labelledby="evidence-panel-title">
      <h2 id="evidence-panel-title">Evidências</h2>
      {workspace.evidence.length > 0 ? (
        <ul className="list-plain">
          {workspace.evidence.map((e) => (
            <EvidenceItem key={e.id} evidence={e} />
          ))}
        </ul>
      ) : (
        <EmptyState title="Nenhuma evidência ainda">
          Evidência é o que mostra o que você fez: saídas, comandos, commits. Registre a primeira no formulário abaixo.
        </EmptyState>
      )}
      <EvidenceForm topic={topic} attemptId={activeAttempt?.id} />
    </section>
  )
}

function EvidenceItem({ evidence }: { evidence: Evidence }) {
  const [requesting, setRequesting] = useState(false)
  return (
    <li>
      <strong>{evidence.title}</strong>{' '}
      <span className="tag">{evidence.visibility === 'group' ? 'Compartilhada' : 'Privada'}</span>
      {evidence.url && (
        <div className="small">
          <a href={evidence.url} target="_blank" rel="noopener noreferrer">
            {evidence.url}
          </a>
        </div>
      )}
      {requesting ? (
        <ReviewRequestForm evidenceId={evidence.id} onCancel={() => setRequesting(false)} />
      ) : (
        <button type="button" className="button-quiet" style={{ marginTop: '0.4rem' }} onClick={() => setRequesting(true)}>
          Pedir revisão
        </button>
      )}
    </li>
  )
}

function ReviewRequestForm({ evidenceId, onCancel }: { evidenceId: string; onCancel: () => void }) {
  const { data: me } = useMe()
  const request = useRequestReview()
  const groups = me?.groups ?? []
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '')
  const [question, setQuestion] = useState('')

  if (groups.length === 0) {
    return (
      <p className="small">
        Para pedir revisão, entre num grupo em <Link to="/time">Time</Link>.
      </p>
    )
  }
  if (request.data) {
    return (
      <p className="small success">
        Revisão pedida. <Link to={`/revisoes/${request.data.request.id}`}>Ver pedido de revisão</Link>
      </p>
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    request.mutate({ evidenceId, groupId, ...(question ? { question } : {}) })
  }

  return (
    <form onSubmit={submit} className="stack" style={{ marginTop: '0.5rem' }}>
      {groups.length > 1 && (
        <Select label="Grupo" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      )}
      <TextArea
        label="O que você quer que revisem?"
        placeholder="Ex.: minha explicação do linker está correta?"
        rows={2}
        hint="Pedir revisão compartilha esta evidência com o grupo."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <ErrorMessage error={request.error} />
      <div className="row">
        <button type="submit" disabled={request.isPending}>
          Enviar pedido
        </button>
        <button type="button" className="button-quiet" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function EvidenceForm({ topic, attemptId }: { topic: Topic; attemptId?: string }) {
  const { data: me } = useMe()
  const create = useCreateEvidence()
  const empty = { title: '', kind: 'text' as Evidence['kind'], url: '', body: '', aiAssistance: '', share: false }
  const [form, setForm] = useState(empty)
  const group = me?.groups[0]

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate(
      {
        topicId: topic.id,
        ...(attemptId ? { attemptId } : {}),
        kind: form.kind,
        title: form.title,
        ...(form.kind !== 'text' ? { url: form.url } : {}),
        ...(form.body ? { body: form.body } : {}),
        ...(form.aiAssistance ? { aiAssistance: form.aiAssistance } : {}),
        ...(form.share && group ? { visibility: 'group', groupId: group.id } : { visibility: 'private' }),
      },
      { onSuccess: () => setForm(empty) },
    )
  }

  return (
    <form onSubmit={submit} className="stack" aria-label="Registrar evidência">
      <h3 style={{ margin: '0.5rem 0 0' }}>Registrar evidência</h3>
      <TextField label="Título" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <Select label="Tipo" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Evidence['kind'] })}>
        {Object.entries(KIND_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      {form.kind !== 'text' && (
        <TextField label="Link" type="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      )}
      <MarkdownEditor
        label="O que a evidência mostra"
        placeholder="Cole a saída real num bloco ``` e explique com suas palavras o que ela mostra"
        rows={5}
        hint="Cole saídas reais (em blocos ```) e explique com suas palavras. Código enviado nunca é executado."
        value={form.body}
        onChange={(body) => setForm({ ...form, body })}
      />
      <TextArea
        label="Assistência de IA (se houve)"
        placeholder="Ex.: pedi uma dica sobre o erro, sem a solução"
        rows={2}
        value={form.aiAssistance}
        onChange={(e) => setForm({ ...form, aiAssistance: e.target.value })}
      />
      {group && (
        <label className="choice small">
          <input type="checkbox" checked={form.share} onChange={(e) => setForm({ ...form, share: e.target.checked })} />
          <span>Compartilhar com {group.name}</span>
        </label>
      )}
      <ErrorMessage error={create.error} />
      <button type="submit" disabled={create.isPending}>
        Salvar evidência
      </button>
    </form>
  )
}
