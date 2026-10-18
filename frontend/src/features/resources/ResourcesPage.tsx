import { useDeferredValue, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useMe, useResources, useRoadmap, useSuggestResource } from '../../api/queries'
import { Select, TextArea, TextField } from '../../components/Field'
import { ResourceDetails } from '../../components/ResourceCard'
import { DIFFICULTY_LABEL, FORMAT_LABEL } from '../../lib/labels'
import { ErrorMessage, Loading } from '../../components/Status'
import { plural } from '../../lib/format'
import { useTopicTitles } from '../../lib/useTopicTitles'

export function ResourcesPage() {
  const [filters, setFilters] = useState({ q: '', topic: '', language: '', format: '', difficulty: '' })
  const q = useDeferredValue(filters.q)
  const { data, error, isPending } = useResources({ ...filters, q })
  const { data: roadmap } = useRoadmap()
  const topicTitle = useTopicTitles()
  const set = (key: keyof typeof filters) => (e: { target: { value: string } }) => setFilters({ ...filters, [key]: e.target.value })

  return (
    <>
      <h1>Recursos</h1>
      <p className="prose muted">
        Akita para intuição e contexto, documentação e livros para precisão, laboratórios para verificar. Links marcados
        como “aguardando verificação” ainda não foram abertos por alguém do time.
      </p>
      <SuggestForm />
      <div>
        <div>
          <div className="filters">
            <TextField label="Buscar" type="search" prefix="❯" placeholder="grep título…" value={filters.q} onChange={set('q')} />
            <Select label="Tópico" value={filters.topic} onChange={set('topic')}>
              <option value="">Todos</option>
              {roadmap?.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
            <Select label="Idioma" value={filters.language} onChange={set('language')}>
              <option value="">Todos</option>
              <option value="pt-BR">Português</option>
              <option value="en">Inglês</option>
            </Select>
            <Select label="Formato" value={filters.format} onChange={set('format')}>
              <option value="">Todos</option>
              {Object.entries(FORMAT_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Select label="Dificuldade" value={filters.difficulty} onChange={set('difficulty')}>
              <option value="">Todas</option>
              {Object.entries(DIFFICULTY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          {isPending && <Loading />}
          <ErrorMessage error={error} />
          {data && (
            <>
              <p role="status" className="muted small">
                {plural(data.length, 'recurso', 'recursos')}
              </p>
              <ul className="list-plain">
                {data.map((r) => (
                  <li key={r.id}>
                    <ResourceDetails resource={r} />
                    <p className="small" style={{ margin: '0.4rem 0 0' }}>
                      <span className="muted">Tópicos:</span>{' '}
                      {r.topics.map((t, i) => (
                        <span key={t}>
                          {i > 0 && ', '}
                          <Link to={`/topicos/${t}`}>{topicTitle(t)}</Link>
                        </span>
                      ))}
                      {r.priority === 'core' && <span className="tag" style={{ marginLeft: '0.5rem' }}>Essencial</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function SuggestForm() {
  const { data: me } = useMe()
  const { data: roadmap } = useRoadmap()
  const group = me?.groups[0]
  const suggest = useSuggestResource(group?.id ?? '')
  const empty = { title: '', url: '', topic: '', rationale: '' }
  const [form, setForm] = useState(empty)

  if (!group) {
    return (
      <p className="muted small">
        Entre num grupo em <Link to="/time">Time</Link> para sugerir recursos.
      </p>
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    suggest.mutate(
      { title: form.title, url: form.url, topicIds: form.topic ? [form.topic] : [], ...(form.rationale ? { rationale: form.rationale } : {}) },
      { onSuccess: () => setForm(empty) },
    )
  }

  return (
    <details>
      <summary>Sugerir um recurso</summary>
    <form onSubmit={submit} className="stack details-body" aria-label="Sugerir recurso">
      <p className="hint">A sugestão vai para o mentor de {group.name} revisar antes de entrar na biblioteca.</p>
      <TextField label="Título" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <TextField label="Link" type="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      <Select label="Tópico relacionado" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
        <option value="">Nenhum</option>
        {roadmap?.topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </Select>
      <TextArea label="Por que usar" rows={3} value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })} />
      <ErrorMessage error={suggest.error} />
      <button type="submit" disabled={suggest.isPending}>
        Enviar sugestão
      </button>
      {suggest.isSuccess && <p className="success small">Sugestão enviada para revisão.</p>}
    </form>
    </details>
  )
}
