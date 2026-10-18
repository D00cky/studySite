import { Link } from 'react-router'
import { useContinue, useMe, useMyProgress, useRoadmap } from '../../api/queries'
import { InlineMarkdown } from '../../components/Markdown'
import { EmptyState, ErrorMessage, Loading } from '../../components/Status'
import { formatDate, formatDateTime } from '../../lib/format'
import { useTopicTitles } from '../../lib/useTopicTitles'
import { StageProgress } from './StageProgress'
import { StudySessionPanel } from './StudySessionPanel'

const VERDICT_LABEL = { comment: 'Comentário', changes_requested: 'Pediu mudanças', accepted: 'Aprovou' } as const

export function HomePage() {
  const { data, error, isPending } = useContinue()
  const { data: me } = useMe()
  const { data: progress = {}, isSuccess: progressLoaded } = useMyProgress()
  const { data: roadmap } = useRoadmap()
  const topicTitle = useTopicTitles()
  const counts = Object.values(progress).reduce(
    (acc, p) => {
      if (p.status === 'demonstrated') acc.demonstrated++
      else if (p.status === 'evidence') acc.evidence++
      else if (p.status !== 'not_started') acc.active++
      return acc
    },
    { demonstrated: 0, evidence: 0, active: 0 },
  )
  const notStarted = progressLoaded && counts.active + counts.evidence + counts.demonstrated === 0

  return (
    <>
      <header className="page-hero">
        {me && <p className="eyebrow">Olá, {me.displayName}</p>}
        <h1>Continue de onde parou</h1>
      </header>
      {isPending && <Loading count={4} />}
      <ErrorMessage error={error} />
      {data && (
        <div className="two-col">
          <div className="stack">
            <section className="callout" aria-labelledby="next-action-title">
              <h2 id="next-action-title" className="small muted" style={{ margin: 0 }}>
                Próxima ação
              </h2>
              <p className="next-action">
                <InlineMarkdown text={data.nextAction.text} />
              </p>
              {data.nextAction.topicId && (
                <Link to={`/topicos/${data.nextAction.topicId}`}>Abrir tópico: {topicTitle(data.nextAction.topicId)}</Link>
              )}
            </section>

            {data.restartPoint?.restartNote && (
              <section className="panel" aria-labelledby="restart-title">
                <h2 id="restart-title">Sua nota de retomada</h2>
                <p>{data.restartPoint.restartNote}</p>
                <p className="muted small">
                  Sessão de {formatDateTime(data.restartPoint.startedAt)}
                  {data.restartPoint.topicId && <> · {topicTitle(data.restartPoint.topicId)}</>}
                </p>
              </section>
            )}

            {data.changesRequested.length > 0 && (
              <section className="panel" aria-labelledby="changes-title">
                <h2 id="changes-title">Feedback esperando sua resposta</h2>
                <ul className="list-plain">
                  {data.changesRequested.map((c) => (
                    <li key={c.reviewRequestId}>
                      <Link to={`/revisoes/${c.reviewRequestId}`}>{c.evidenceTitle}</Link>
                      {c.topicId && <span className="muted small"> · {topicTitle(c.topicId)}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.recentFeedback.length > 0 && (
              <section className="panel" aria-labelledby="feedback-title">
                <h2 id="feedback-title">Feedback recente</h2>
                <ul className="list-plain">
                  {data.recentFeedback.map((f) => (
                    <li key={f.id}>
                      <strong>{f.authorName}</strong> · <span className="tag">{VERDICT_LABEL[f.verdict]}</span>
                      <p style={{ margin: '0.3rem 0 0' }}>{f.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="progress-title">
              <h2 id="progress-title" className="visually-hidden">
                Seu progresso
              </h2>
              {notStarted ? (
                <EmptyState title="Você ainda não começou nenhum tópico">
                  Abra a próxima ação acima ou escolha um tópico na trilha. Abrir um recurso já conta como exploração.
                </EmptyState>
              ) : (
                <div className="stat-row">
                  <div className="stat">
                    <strong>{counts.active}</strong>
                    <span>em exploração ou prática</span>
                  </div>
                  <div className="stat">
                    <strong>{counts.evidence}</strong>
                    <span>com evidência registrada</span>
                  </div>
                  <div className="stat">
                    <strong>{counts.demonstrated}</strong>
                    <span>demonstrados em revisão</span>
                  </div>
                </div>
              )}
              <p className="small" style={{ marginTop: '0.5rem' }}>
                <Link to="/roadmap">Ver a trilha completa</Link>
              </p>
            </section>

            {roadmap && <StageProgress roadmap={roadmap} progress={progress} />}

            {data.suggestedTopic && data.nextAction.topicId !== data.suggestedTopic.topicId && (
              <p className="muted">
                Sugestão no roadmap:{' '}
                <Link to={`/topicos/${data.suggestedTopic.topicId}`}>{data.suggestedTopic.title}</Link> —{' '}
                {data.suggestedTopic.reason}
              </p>
            )}
          </div>

          <aside className="stack" aria-label="Sessão e pendências">
            <StudySessionPanel topicId={data.nextAction.topicId} />
            {data.reviewsToGive > 0 && (
              <p>
                <Link to="/time">
                  {data.reviewsToGive} {data.reviewsToGive === 1 ? 'revisão esperando' : 'revisões esperando'} por você
                </Link>
              </p>
            )}
            {data.lastDemonstrated && (
              <p className="muted small">
                Última habilidade demonstrada: {topicTitle(data.lastDemonstrated.topicId)} (
                {formatDate(data.lastDemonstrated.acceptedAt)})
              </p>
            )}
            {data.weeklyMode && (
              <p className="muted small">
                Ritmo semanal: {data.weeklyMode.title} ({data.weeklyMode.time}). Sem sequências nem penalidades — retome
                quando puder.
              </p>
            )}
          </aside>
        </div>
      )}
    </>
  )
}
