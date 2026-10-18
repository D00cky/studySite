import { Link } from 'react-router'
import type { Stage, TopicProgress, TopicSummary } from '../../api/types'
import { ProgressTag } from '../../components/ProgressTag'

interface Props {
  stages: Stage[]
  topics: TopicSummary[]
  progress: Record<string, TopicProgress>
}

/** Visão acessível do roadmap: listas aninhadas por etapa, navegáveis por teclado e leitor de tela. */
export function RoadmapList({ stages, topics, progress }: Props) {
  const groups = [
    { kind: 'core', title: 'Tronco comum' },
    { kind: 'branch', title: 'Ramos opcionais' },
  ] as const

  return (
    <>
      {groups.map((g) => {
        const groupStages = stages.filter((s) => s.kind === g.kind && topics.some((t) => t.stage === s.id))
        if (groupStages.length === 0) return null
        return (
          <section key={g.kind} aria-labelledby={`group-${g.kind}`}>
            <h2 id={`group-${g.kind}`}>{g.title}</h2>
            <ol className="stage-list">
              {groupStages.map((stage) => (
                <li key={stage.id}>
                  <div className="stage-header">
                    <h3>{stage.kind === 'core' ? `${stage.order}. ${stage.title}` : stage.title}</h3>
                    {stage.status === 'planned' && <span className="tag">Visão geral</span>}
                  </div>
                  <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
                    {stage.summary}
                  </p>
                  <ul className="topic-list">
                    {topics
                      .filter((t) => t.stage === stage.id)
                      .map((t) => (
                        <li key={t.id}>
                          <Link to={`/topicos/${t.id}`}>{t.title}</Link>
                          <span className="row">
                            {t.status === 'planned' && <span className="tag">Lição planejada</span>}
                            {progress[t.id] && progress[t.id]!.status !== 'not_started' && (
                              <ProgressTag status={progress[t.id]!.status} />
                            )}
                          </span>
                          <p className="objective">{t.objective}</p>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </>
  )
}
