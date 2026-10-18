import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useMyProgress, useRoadmap } from '../../api/queries'
import type { Stage, TopicSummary } from '../../api/types'
import { Select, TextField } from '../../components/Field'
import { ErrorMessage, Loading } from '../../components/Status'
import { plural } from '../../lib/format'
import { matches } from '../../lib/text'
import { RoadmapGraph } from './RoadmapGraph'
import { RoadmapList } from './RoadmapList'

export function RoadmapPage() {
  const { data, error, isPending } = useRoadmap()
  const { data: progress = {} } = useMyProgress()
  const [params, setParams] = useSearchParams()
  const view = params.get('visao') === 'grafo' ? 'graph' : 'list'
  const [query, setQuery] = useState('')
  const [stageId, setStageId] = useState('')
  const [authoredOnly, setAuthoredOnly] = useState(false)

  const visible = useMemo<TopicSummary[]>(
    () =>
      (data?.topics ?? []).filter(
        (t) =>
          (!stageId || t.stage === stageId) &&
          (!authoredOnly || t.status === 'authored') &&
          matches(query, t.title, t.objective, t.id),
      ),
    [data, query, stageId, authoredOnly],
  )

  const sortedStages = useMemo<Stage[]>(() => [...(data?.stages ?? [])].sort((a, b) => a.order - b.order), [data])

  function setView(next: 'list' | 'graph') {
    const p = new URLSearchParams(params)
    if (next === 'graph') p.set('visao', 'grafo')
    else p.delete('visao')
    setParams(p, { replace: true })
  }

  return (
    <>
      <h1>Roadmap</h1>
      <p className="prose muted">
        Etapas, não meses: avance quando conseguir demonstrar o que aprendeu. Você pode abrir qualquer tópico — se faltar
        base, a página mostra por onde começar.
      </p>
      {isPending && <Loading />}
      <ErrorMessage error={error} />
      {data && (
        <>
          <div className="filters">
            <TextField label="Buscar tópico" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select label="Etapa" value={stageId} onChange={(e) => setStageId(e.target.value)}>
              <option value="">Todas</option>
              {sortedStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.kind === 'core' ? `${s.order}. ${s.title}` : s.title}
                </option>
              ))}
            </Select>
            <label className="choice">
              <input type="checkbox" checked={authoredOnly} onChange={(e) => setAuthoredOnly(e.target.checked)} />
              <span>Só lições completas</span>
            </label>
            <div className="segmented" role="group" aria-label="Visualização">
              <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
                Lista
              </button>
              <button type="button" aria-pressed={view === 'graph'} onClick={() => setView('graph')}>
                Grafo
              </button>
            </div>
          </div>
          <p role="status" className="muted small">
            {plural(visible.length, 'tópico', 'tópicos')}
          </p>
          {view === 'list' ? (
            <RoadmapList stages={sortedStages} topics={visible} progress={progress} />
          ) : (
            <RoadmapGraph stages={sortedStages} topics={visible} allTopics={data.topics} progress={progress} />
          )}
        </>
      )}
    </>
  )
}
