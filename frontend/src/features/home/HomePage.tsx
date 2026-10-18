import { Link } from 'react-router'
import { useContinue, useMe, useMyProgress } from '../../api/queries'
import { InlineMarkdown } from '../../components/Markdown'
import { ErrorMessage, Loading } from '../../components/Status'
import { formatDate, formatDateTime } from '../../lib/format'
import { useTopicTitles } from '../../lib/useTopicTitles'
import { Built, Journey, Pattern, StudyTime } from '../progress/sections'
import { useProgressData } from '../progress/useProgressData'
import { StudyCalendar } from '../progress/StudyCalendar'
import { StageProgress } from './StageProgress'
import { StudySessionPanel } from './StudySessionPanel'

const VERDICT_LABEL = { comment: 'Comentário', changes_requested: 'Pediu mudanças', accepted: 'Aprovou' } as const

export function HomePage() {
  const { data, error, isPending } = useContinue()
  const { data: me } = useMe()
  const { data: progress = {} } = useMyProgress()
  const { metrics: metricsQuery, roadmap, evidence, demonstrated, started, firstDate } = useProgressData()
  const metrics = metricsQuery.data
  const topicTitle = useTopicTitles()

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

            <Journey
              roadmap={roadmap}
              nextTopic={data.nextAction.topicId ?? data.suggestedTopic?.topicId}
              firstDate={firstDate}
              demonstrated={demonstrated.length}
              started={started}
              topicTitle={topicTitle}
            />

            {metrics && <StudyTime metrics={metrics} />}
            <StudyCalendar />

            {roadmap && <StageProgress roadmap={roadmap} progress={progress} />}
            <p className="small" style={{ margin: 0 }}>
              <Link to="/roadmap">Ver a trilha completa</Link>
            </p>

            {data.suggestedTopic && data.nextAction.topicId !== data.suggestedTopic.topicId && (
              <p className="muted">
                Sugestão no roadmap:{' '}
                <Link to={`/topicos/${data.suggestedTopic.topicId}`}>{data.suggestedTopic.title}</Link> —{' '}
                {data.suggestedTopic.reason}
              </p>
            )}
          </div>

          <aside className="stack" aria-label="Sessão e pendências">
            {metrics && metrics.focusBlocks > 0 && <Pattern metrics={metrics} />}
            <Built evidence={evidence} demonstrated={demonstrated} topicTitle={topicTitle} limit={4} />
            <p className="small" style={{ margin: 0 }}>
              <Link to="/progresso">Ver progresso detalhado</Link>
            </p>
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
