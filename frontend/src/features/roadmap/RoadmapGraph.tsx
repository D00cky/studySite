import { useMemo, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import type { Stage, TopicProgress, TopicSummary } from '../../api/types'
import { PROGRESS_LABEL } from '../../lib/format'

interface Props {
  stages: Stage[]
  topics: TopicSummary[]
  allTopics: TopicSummary[]
  progress: Record<string, TopicProgress>
}

const COL_W = 210
const NODE_W = 180
const NODE_H = 44
const ROW_H = 60
const TOP = 40
const PAD = 16

/**
 * Grafo de dependências: uma coluna por etapa, arestas do pré-requisito para o tópico.
 * Nós são botões focáveis; Enter/Espaço seleciona e mostra os detalhes ao lado.
 * A lista continua sendo a visão principal para leitores de tela e telas pequenas.
 */
export function RoadmapGraph({ stages, topics, allTopics, progress }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const layout = useMemo(() => {
    const columns = stages.filter((s) => topics.some((t) => t.stage === s.id))
    const pos = new Map<string, { x: number; y: number }>()
    let maxRows = 0
    columns.forEach((stage, col) => {
      const inStage = topics.filter((t) => t.stage === stage.id)
      maxRows = Math.max(maxRows, inStage.length)
      inStage.forEach((t, row) => pos.set(t.id, { x: PAD + col * COL_W, y: TOP + row * ROW_H }))
    })
    return { columns, pos, width: PAD * 2 + columns.length * COL_W, height: TOP + maxRows * ROW_H + PAD }
  }, [stages, topics])

  const byId = useMemo(() => new Map(allTopics.map((t) => [t.id, t])), [allTopics])
  const selected = selectedId ? byId.get(selectedId) : undefined
  const unlocks = selected ? allTopics.filter((t) => t.prerequisites.includes(selected.id)) : []

  function onKey(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelectedId(id)
    }
  }

  return (
    <div className="stack">
      <div className="graph-wrap">
        <svg width={layout.width} height={layout.height} role="group" aria-label="Grafo de dependências entre tópicos">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="graph-arrow" />
            </marker>
          </defs>
          {layout.columns.map((stage, col) => (
            <text key={stage.id} x={PAD + col * COL_W} y={22} className="graph-stage-label">
              {stage.kind === 'core' ? `${stage.order}. ` : ''}
              {stage.title.length > 26 ? `${stage.title.slice(0, 25)}…` : stage.title}
            </text>
          ))}
          {topics.flatMap((t) =>
            t.prerequisites
              .filter((p) => layout.pos.has(p))
              .map((p) => {
                const from = layout.pos.get(p)!
                const to = layout.pos.get(t.id)!
                const y1 = from.y + NODE_H / 2
                const y2 = to.y + NODE_H / 2
                const highlight = selectedId === t.id || selectedId === p
                // Mesma coluna (ou para trás): arco pelo lado esquerdo, para não cruzar os nós.
                const d =
                  to.x <= from.x
                    ? `M${from.x},${y1} C${from.x - 28},${y1} ${to.x - 28},${y2} ${to.x},${y2}`
                    : `M${from.x + NODE_W},${y1} C${(from.x + NODE_W + to.x) / 2},${y1} ${(from.x + NODE_W + to.x) / 2},${y2} ${to.x},${y2}`
                return (
                  <path
                    key={`${p}->${t.id}`}
                    d={d}
                    className={`graph-edge${highlight ? ' highlight' : ''}`}
                    markerEnd="url(#arrow)"
                    aria-hidden="true"
                  />
                )
              }),
          )}
          {topics.map((t) => {
            const p = layout.pos.get(t.id)
            if (!p) return null
            const status = progress[t.id]?.status ?? 'not_started'
            const classes = ['graph-node', t.status, status, selectedId === t.id ? 'selected' : ''].join(' ')
            return (
              <g
                key={t.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedId === t.id}
                aria-label={`${t.title} — ${PROGRESS_LABEL[status]}${t.status === 'planned' ? ', lição planejada' : ''}`}
                className={classes}
                transform={`translate(${p.x},${p.y})`}
                onClick={() => setSelectedId(t.id)}
                onKeyDown={(e) => onKey(e, t.id)}
              >
                <rect width={NODE_W} height={NODE_H} rx={6} />
                <text x={10} y={NODE_H / 2 + 4}>
                  {t.title.length > 24 ? `${t.title.slice(0, 23)}…` : t.title}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <section aria-label="Tópico selecionado" className="panel" aria-live="polite">
        {selected ? (
          <>
            <h2>{selected.title}</h2>
            <p>{selected.objective}</p>
            <h3>Pré-requisitos</h3>
            {selected.prerequisites.length === 0 ? (
              <p className="muted">Nenhum.</p>
            ) : (
              <ul>
                {selected.prerequisites.map((id) => (
                  <li key={id}>
                    <Link to={`/topicos/${id}`}>{byId.get(id)?.title ?? id}</Link>
                  </li>
                ))}
              </ul>
            )}
            <h3>Libera</h3>
            {unlocks.length === 0 ? (
              <p className="muted">Nenhum tópico depende diretamente deste.</p>
            ) : (
              <ul>
                {unlocks.map((t) => (
                  <li key={t.id}>
                    <Link to={`/topicos/${t.id}`}>{t.title}</Link>
                  </li>
                ))}
              </ul>
            )}
            <Link className="button" to={`/topicos/${selected.id}`}>
              Abrir tópico
            </Link>
          </>
        ) : (
          <p className="muted">Selecione um tópico no grafo (clique ou Tab + Enter) para ver dependências.</p>
        )}
      </section>
    </div>
  )
}
