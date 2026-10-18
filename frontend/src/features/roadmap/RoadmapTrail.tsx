import type { Stage, TopicProgress, TopicSummary } from '../../api/types'
import { PROGRESS_LABEL } from '../../lib/format'

interface Props {
  stages: Stage[]
  topics: TopicSummary[]
  progress: Record<string, TopicProgress>
  selectedId: string | null
  onSelect: (topicId: string, trigger: HTMLElement) => void
}

/**
 * Trilha no estilo roadmap.sh: uma espinha vertical, cada etapa num nó de destaque e
 * os tópicos em nós menores dos dois lados. É HTML semântico (listas e botões), então
 * funciona com teclado e leitor de tela; no celular vira uma coluna.
 */
export function RoadmapTrail({ stages, topics, progress, selectedId, onSelect }: Props) {
  const core = stages.filter((s) => s.kind === 'core' && topics.some((t) => t.stage === s.id))
  const branches = stages.filter((s) => s.kind === 'branch' && topics.some((t) => t.stage === s.id))

  return (
    <div className="trail-wrap">
      <ol className="trail" aria-label="Trilha do tronco comum">
        {core.map((stage) => (
          <StageNode key={stage.id} stage={stage} topics={topics} progress={progress} selectedId={selectedId} onSelect={onSelect} />
        ))}
      </ol>
      {branches.length > 0 && (
        <>
          <h2 className="trail-branches-title">Ramos opcionais</h2>
          <ul className="trail trail-branches" aria-label="Ramos opcionais">
            {branches.map((stage) => (
              <StageNode key={stage.id} stage={stage} topics={topics} progress={progress} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function StageNode({
  stage,
  topics,
  progress,
  selectedId,
  onSelect,
}: { stage: Stage } & Omit<Props, 'stages'>) {
  const inStage = topics.filter((t) => t.stage === stage.id)
  const demonstrated = inStage.filter((t) => progress[t.id]?.status === 'demonstrated').length
  const half = Math.ceil(inStage.length / 2)
  const sides = [inStage.slice(0, half), inStage.slice(half)]

  return (
    <li className={`trail-stage ${stage.kind}`}>
      <div className="trail-stage-node">
        {stage.kind === 'core' && (
          <span className="trail-stage-num" aria-hidden="true">
            {stage.order}
          </span>
        )}
        <div>
          <h3>
            {stage.kind === 'core' && <span className="visually-hidden">Etapa {stage.order}: </span>}
            {capitalize(stage.title.replace(/^Ramo: /, ''))}
          </h3>
          <p className="trail-stage-meta">
            {demonstrated}/{inStage.length} demonstrados
            {stage.status === 'planned' && ' · visão geral'}
          </p>
        </div>
      </div>
      <div className="trail-topics">
        {sides.map((side, i) => (
          <ul key={i} className={`trail-side ${i === 0 ? 'left' : 'right'}`}>
            {side.map((t) => {
              const status = progress[t.id]?.status ?? 'not_started'
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`trail-topic status-${status}${t.status === 'planned' ? ' planned' : ''}${selectedId === t.id ? ' selected' : ''}`}
                    aria-label={`${t.title} — ${PROGRESS_LABEL[status]}${t.status === 'planned' ? ', lição planejada' : ''}`}
                    aria-haspopup="dialog"
                    onClick={(e) => onSelect(t.id, e.currentTarget)}
                  >
                    <span className="trail-topic-title">{t.title}</span>
                    <StatusIcon status={status} />
                  </button>
                </li>
              )
            })}
          </ul>
        ))}
      </div>
    </li>
  )
}

function StatusIcon({ status }: { status: TopicProgress['status'] }) {
  if (status === 'not_started') return null
  return (
    <span className={`trail-topic-icon icon-${status}`} aria-hidden="true">
      {status === 'demonstrated' ? '✓' : ''}
    </span>
  )
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
