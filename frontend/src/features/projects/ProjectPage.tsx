import { Link, useParams } from 'react-router'
import { usePolicies, useProject } from '../../api/queries'
import type { Project } from '../../api/types'
import { InlineMarkdown, Markdown } from '../../components/Markdown'
import { ErrorMessage, Loading } from '../../components/Status'
import { useTopicTitles } from '../../lib/useTopicTitles'

export function ProjectPage() {
  const { projectId = '' } = useParams()
  const { data, error, isPending } = useProject(projectId)
  const topicTitle = useTopicTitles()
  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  const p = data
  return (
    <div className="prose">
      <p className="muted small">
        <Link to="/projetos">Projetos</Link>
      </p>
      <h1>{p.title}</h1>
      {p.status === 'planned' && (
        <p className="callout callout-warning">
          Os detalhes deste projeto ainda estão planejados: há pergunta, versão mínima e marcos, mas critérios e
          experimentos completos virão depois.
        </p>
      )}
      <p className="next-action" style={{ fontWeight: 500 }}>
        {p.question}
      </p>
      <h2>Versão mínima</h2>
      <Markdown text={p.minimalVersion} />
      {p.prerequisites.length > 0 && (
        <p className="small">
          <span className="muted">Pré-requisitos:</span>{' '}
          {p.prerequisites.map((id, i) => (
            <span key={id}>
              {i > 0 && ', '}
              <Link to={`/topicos/${id}`}>{topicTitle(id)}</Link>
            </span>
          ))}
        </p>
      )}
      <PracticeSection project={p} />
      <MilestoneList project={p} />
      <ListDetails title="Restrições que preservam a habilidade" items={p.constraints} />
      <ListDetails title="Extensões" items={p.extensions} />
      <ListDetails title="Casos-limite" items={p.edgeCases} />
      <ListDetails title="Experimentos de falha" items={p.failureExperiments} />
      <ListDetails title="Ferramentas para observar" items={p.tools} />
      <ListDetails title="Critérios de aceitação" items={p.acceptanceCriteria} />
      <ListDetails title="Evidência para a revisão" items={p.evidence} />
      <ListDetails title="Perguntas para a explicação oral" items={p.reviewQuestions} />
      <p className="muted small" style={{ marginTop: '1.5rem' }}>
        Para trabalhar em equipe, comece o projeto em <Link to="/time">Time</Link>.
      </p>
    </div>
  )
}

/** Prática deliberada antes de construir: redigitar uma referência real (método inspirado no Akita). */
function PracticeSection({ project }: { project: Project }) {
  const { data: policies } = usePolicies()
  if (!project.practice) return null
  const method = policies?.practiceMethod
  return (
    <section className="terminal practice" aria-labelledby="practice-title">
      <div className="terminal-bar" aria-hidden="true">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">pratica.md</span>
      </div>
      <div className="terminal-body">
        <h2 id="practice-title">Prática antes de construir</h2>
        <Markdown text={project.practice.guidance} />
        <p className="terminal-comment"># referências para redigitar à mão (sem colar)</p>
        <ul className="list-plain">
          {project.practice.references.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
                <span className="visually-hidden"> (abre em nova aba)</span>
              </a>
              <div className="muted small">
                {r.author}
                {r.language && <> · {r.language}</>}
                {r.license && <> · licença {r.license}</>}
              </div>
            </li>
          ))}
        </ul>
        {method && (
          <>
            <ol className="method-steps">
              {method.steps.map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong>
                </li>
              ))}
            </ol>
            <p className="small">
              <Link to="/como-estudamos#pratica">Ver o método completo e as fontes</Link>
            </p>
          </>
        )}
      </div>
    </section>
  )
}

function MilestoneList({ project }: { project: Project }) {
  return (
    <section aria-labelledby="milestones-title">
      <h2 id="milestones-title">Marcos</h2>
      <ol>
        {project.milestones.map((m) => (
          <li key={m.id}>
            <strong>{m.title}</strong>
            {m.minutes && <span className="muted small"> · ~{m.minutes} min</span>}
            {m.description && <div className="small">{m.description}</div>}
          </li>
        ))}
      </ol>
    </section>
  )
}

function ListDetails({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <details>
      <summary>{title}</summary>
      <ul className="details-body">
        {items.map((i) => (
          <li key={i}>
            <InlineMarkdown text={i} />
          </li>
        ))}
      </ul>
    </details>
  )
}
