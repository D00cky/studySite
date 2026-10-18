import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useMyProgress, useRoadmap } from '../../api/queries'
import type { Stage, TopicSummary } from '../../api/types'
import { Select, TextField } from '../../components/Field'
import { ErrorMessage, Loading } from '../../components/Status'
import { plural } from '../../lib/format'
import { matches } from '../../lib/text'
import { RoadmapGraph } from './RoadmapGraph'
import { RoadmapList } from './RoadmapList'
import { RoadmapTrail } from './RoadmapTrail'
import { TopicDrawer } from './TopicDrawer'

export function RoadmapPage() {
  const { data, error, isPending } = useRoadmap()
  const { data: progress = {} } = useMyProgress()
  const [params, setParams] = useSearchParams()
  const view = params.get('visao') === 'grafo' ? 'graph' : params.get('visao') === 'lista' ? 'list' : 'trail'
  const [selected, setSelected] = useState<string | null>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const select = useCallback((id: string, el: HTMLElement) => {
    trigger.current = el
    setSelected(id)
  }, [])
  const closeDrawer = useCallback(() => {
    setSelected(null)
    trigger.current?.focus()
  }, [])
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

  function setView(next: 'trail' | 'list' | 'graph') {
    const p = new URLSearchParams(params)
    if (next === 'graph') p.set('visao', 'grafo')
    else if (next === 'list') p.set('visao', 'lista')
    else p.delete('visao')
    setParams(p, { replace: true })
  }

  return (
    <>
      <header className="page-hero">
        <p className="eyebrow">Ciência da computação e engenharia de software</p>
        <h1>Roadmap</h1>
        <p className="prose">
          Etapas, não meses: avance quando conseguir demonstrar o que aprendeu. Você pode abrir qualquer tópico — se
          faltar base, a lição mostra por onde começar.
        </p>
        <ul className="legend" aria-label="Legenda">
          <li><span className="legend-swatch status-not_started" /> Não iniciado</li>
          <li><span className="legend-swatch status-exploring" /> Explorando / praticando</li>
          <li><span className="legend-swatch status-evidence" /> Com evidência</li>
          <li><span className="legend-swatch status-demonstrated" /> Demonstrado</li>
          <li><span className="legend-swatch planned" /> Lição planejada</li>
        </ul>
      </header>
      {isPending && <Loading />}
      <ErrorMessage error={error} />
      {data && (
        <>
          <div className="filters">
            <TextField
              label="Buscar tópico"
              type="search"
              prefix="❯"
              placeholder="grep ponteiro…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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
              <button type="button" aria-pressed={view === 'trail'} onClick={() => setView('trail')}>
                Trilha
              </button>
              <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
                Lista
              </button>
              <button type="button" aria-pressed={view === 'graph'} onClick={() => setView('graph')}>
                Dependências
              </button>
            </div>
          </div>
          <p role="status" className="muted small">
            {plural(visible.length, 'tópico', 'tópicos')}
          </p>
          {view === 'trail' && (
            <RoadmapTrail stages={sortedStages} topics={visible} progress={progress} selectedId={selected} onSelect={select} />
          )}
          {view === 'list' && <RoadmapList stages={sortedStages} topics={visible} progress={progress} />}
          {view === 'graph' && (
            <RoadmapGraph stages={sortedStages} topics={visible} allTopics={data.topics} progress={progress} />
          )}
          {view === 'trail' && selected && (
            <TopicDrawer topicId={selected} progress={progress[selected]} onClose={closeDrawer} />
          )}
        </>
      )}
    </>
  )
}
