import { ErrorMessage, Loading } from '../../components/Status'
import { Built, Journey, Pattern, StudyTime, TopicTime } from './sections'
import { StudyCalendar } from './StudyCalendar'
import { useProgressData } from './useProgressData'

/** Página "Meu progresso": a versão detalhada do que a home resume. Sem sequências. */
export function ProgressPage() {
  const { metrics, roadmap, next, evidence, topicTitle, demonstrated, started, firstDate } = useProgressData()
  if (metrics.isPending) return <Loading count={6} />
  if (metrics.error) return <ErrorMessage error={metrics.error} />
  const m = metrics.data
  return (
    <>
      <header className="page-hero prose">
        <p className="eyebrow">progresso</p>
        <h1>Meu progresso</h1>
        <p>Quanto você estudou, como costuma estudar e para onde está indo. O ritmo é seu: 20 ou 40 minutos contam igual.</p>
      </header>
      <div className="progress-grid">
        <Journey
          roadmap={roadmap}
          nextTopic={next?.nextAction.topicId ?? next?.suggestedTopic?.topicId}
          nextText={next?.nextAction.text}
          firstDate={firstDate}
          demonstrated={demonstrated.length}
          started={started}
          topicTitle={topicTitle}
        />
        <StudyTime metrics={m} />
        <StudyCalendar />
        {m.focusBlocks > 0 && <Pattern metrics={m} />}
        <TopicTime metrics={m} topicTitle={topicTitle} />
        <Built evidence={evidence} demonstrated={demonstrated} topicTitle={topicTitle} />
      </div>
    </>
  )
}
