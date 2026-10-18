import { Link, useParams } from 'react-router'
import { useRecordResourceEvent, useTopicPage, useTopicWorkspace } from '../../api/queries'
import type { Resource } from '../../api/types'
import { InlineMarkdown, Markdown } from '../../components/Markdown'
import { ProgressTag } from '../../components/ProgressTag'
import { ResourceDetails } from '../../components/ResourceCard'
import { VideoList } from '../../components/VideoList'
import { ErrorMessage, Loading } from '../../components/Status'
import { EvidencePanel } from './EvidencePanel'
import { ExercisePanel } from './ExercisePanel'
import { SelfAssessmentPanel } from './SelfAssessmentPanel'

export function TopicPage() {
  const { topicId = '' } = useParams()
  const page = useTopicPage(topicId)
  const workspace = useTopicWorkspace(topicId)
  const record = useRecordResourceEvent()

  if (page.isPending) return <Loading />
  if (page.error) return <ErrorMessage error={page.error} />
  const { topic, stage, startResource, deeperResources, videos, prerequisites, unlocks, related, projects } = page.data
  const ws = workspace.data

  const openResource = (r: Resource) => () => record.mutate({ resourceId: r.id, topicId: topic.id, kind: 'opened' })

  return (
    <>
      <p className="eyebrow">
        <Link to="/roadmap">Roadmap</Link> · {stage.kind === 'core' ? `Etapa ${stage.order}: ` : ''}
        {stage.title}
      </p>
      <div className="row">
        <h1 style={{ marginBottom: 0 }}>{topic.title}</h1>
        {ws && <ProgressTag status={ws.progress.status} />}
      </div>

      <p className="mobile-only small">
        <a href="#trabalho">Ir para seu trabalho neste tópico (exercício, evidência, autoavaliação)</a>
      </p>
      <div className="two-col" style={{ marginTop: '1rem' }}>
        <article className="prose">
          <section aria-labelledby="objective-title">
            <h2 id="objective-title" className="visually-hidden">
              Objetivo
            </h2>
            <p className="next-action" style={{ fontWeight: 500 }}>
              {topic.objective}
            </p>
            <p>
              <strong>Por que importa:</strong> <InlineMarkdown text={topic.whyItMatters} />
            </p>
            {topic.firstAction && (
              <p>
                <strong>Primeiro passo pequeno:</strong> <InlineMarkdown text={topic.firstAction} />
              </p>
            )}
          </section>

          {topic.status === 'planned' && (
            <p className="callout callout-warning">
              A lição detalhada ainda está planejada. Use o objetivo, os pré-requisitos e os recursos para explorar — e
              registre o que descobrir.
            </p>
          )}

          {ws && ws.missingPrerequisites.length > 0 && (
            <section className="callout" aria-labelledby="before-title">
              <h2 id="before-title" style={{ marginTop: 0, fontSize: '1.05rem' }}>
                Antes de começar
              </h2>
              <p>Você pode seguir, mas estes tópicos dão a base. Se travar, volte a eles:</p>
              <ul>
                {ws.missingPrerequisites.map((p) => (
                  <li key={p.topicId}>
                    <Link to={`/topicos/${p.topicId}`}>{p.title}</Link>
                    {p.firstAction && (
                      <span className="muted small">
                        {' '}
                        — comece com: <InlineMarkdown text={p.firstAction} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {startResource && (
            <section className="panel" aria-labelledby="start-resource-title" style={{ marginTop: '1rem' }}>
              <h2 id="start-resource-title">Comece por aqui</h2>
              <ResourceDetails resource={startResource} onOpen={openResource(startResource)} />
              <div className="row" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => record.mutate({ resourceId: startResource.id, topicId: topic.id, kind: 'finished' })}
                  disabled={record.isPending}
                >
                  Marcar como lido
                </button>
                {record.isSuccess && <span className="success small">Registrado.</span>}
              </div>
              <p className="hint" style={{ marginTop: '0.5rem' }}>
                Abrir ou ler um recurso não conta como domínio — registre evidência quando praticar.
              </p>
            </section>
          )}

          {videos.length > 0 && (
            <section aria-labelledby="videos-title" style={{ marginTop: '1.25rem' }}>
              <h2 id="videos-title">Assista</h2>
              <p className="muted small">Para contextualizar antes ou depois da leitura — assistir não conta como domínio.</p>
              <VideoList videos={videos} />
            </section>
          )}

          {topic.explanation && (
            <details>
              <summary>Explicação</summary>
              <div className="details-body">
                <Markdown text={topic.explanation} />
              </div>
            </details>
          )}
          {topic.misconceptions.length > 0 && (
            <details>
              <summary>Equívocos comuns</summary>
              <div className="details-body">
                <dl>
                  {topic.misconceptions.map((m) => (
                    <div key={m.claim} style={{ marginBottom: '0.8rem' }}>
                      <dt>
                        <strong>“{m.claim}”</strong>
                      </dt>
                      <dd style={{ margin: '0.2rem 0 0' }}>
                        <Markdown text={m.correction} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </details>
          )}
          {topic.exercise && (
            <details>
              <summary>Exercício: {topic.exercise.title}</summary>
              <div className="details-body">
                <p>
                  <strong>Antes, preveja:</strong> <InlineMarkdown text={topic.exercise.prediction} />
                </p>
                <ol>
                  {topic.exercise.steps.map((s) => (
                    <li key={s}>
                      <InlineMarkdown text={s} />
                    </li>
                  ))}
                </ol>
                <p>
                  <strong>Confira:</strong>
                </p>
                <ul>
                  {topic.exercise.checks.map((c) => (
                    <li key={c}>
                      <InlineMarkdown text={c} />
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
          {topic.experiment && topic.experiment.steps.length > 0 && (
            <details>
              <summary>Experimento: {topic.experiment.title}</summary>
              <div className="details-body">
                <ol>
                  {topic.experiment.steps.map((s) => (
                    <li key={s}>
                      <InlineMarkdown text={s} />
                    </li>
                  ))}
                </ol>
                <p>
                  <strong>Observe:</strong>
                </p>
                <ul>
                  {topic.experiment.observe.map((o) => (
                    <li key={o}>
                      <InlineMarkdown text={o} />
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
          {topic.reflectionQuestions.length > 0 && (
            <details>
              <summary>Perguntas para explicar</summary>
              <div className="details-body">
                <ul>
                  {topic.reflectionQuestions.map((q) => (
                    <li key={q}>
                      <InlineMarkdown text={q} />
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
          {(topic.completionCriteria.length > 0 || topic.evidencePrompts.length > 0) && (
            <details>
              <summary>Como saber que terminei</summary>
              <div className="details-body">
                <ul>
                  {topic.completionCriteria.map((c) => (
                    <li key={c}>
                      <InlineMarkdown text={c} />
                    </li>
                  ))}
                </ul>
                {topic.evidencePrompts.length > 0 && (
                  <>
                    <p>
                      <strong>Evidência para levar à revisão:</strong>
                    </p>
                    <ul>
                      {topic.evidencePrompts.map((e) => (
                        <li key={e}>
                          <InlineMarkdown text={e} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </details>
          )}

          {deeperResources.length > 0 && (
            <section aria-labelledby="deeper-title">
              <h2 id="deeper-title">Para aprofundar</h2>
              <ul className="list-plain">
                {deeperResources.map((r) => (
                  <li key={r.id}>
                    <ResourceDetails resource={r} onOpen={openResource(r)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <TopicLinks title="Pré-requisitos" items={prerequisites} />
          <TopicLinks title="Este tópico libera" items={unlocks} />
          <TopicLinks title="Relacionados" items={related} />
          {projects.length > 0 && (
            <section aria-labelledby="projects-title">
              <h2 id="projects-title">Projetos que usam este tópico</h2>
              <ul>
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link to={`/projetos/${p.id}`}>{p.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside id="trabalho" className="stack" aria-label="Seu trabalho neste tópico">
          {workspace.error && <ErrorMessage error={workspace.error} />}
          {ws && (
            <>
              <ExercisePanel topic={topic} attempts={ws.attempts} />
              <EvidencePanel topic={topic} workspace={ws} />
              <SelfAssessmentPanel topicId={topic.id} history={ws.selfAssessments} />
            </>
          )}
        </aside>
      </div>
    </>
  )
}

function TopicLinks({ title, items }: { title: string; items: { id: string; title: string }[] }) {
  if (items.length === 0) return null
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {items.map((t) => (
          <li key={t.id}>
            <Link to={`/topicos/${t.id}`}>{t.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
