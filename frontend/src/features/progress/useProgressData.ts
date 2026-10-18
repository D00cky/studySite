import { useContinue, useMetrics, useMyEvidence, useMyProgress, useRoadmap } from '../../api/queries'
import { useTopicTitles } from '../../lib/useTopicTitles'

/** Dados das seções de progresso, usados na home e em "Meu progresso". */
export function useProgressData() {
  const metrics = useMetrics()
  const { data: roadmap } = useRoadmap()
  const { data: progress = {} } = useMyProgress()
  const { data: next } = useContinue()
  const { data: evidence = [] } = useMyEvidence()
  const topicTitle = useTopicTitles()
  const statuses = Object.values(progress)
  return {
    metrics,
    roadmap,
    next,
    evidence,
    topicTitle,
    demonstrated: statuses.filter((p) => p.status === 'demonstrated').map((p) => p.topicId),
    started: statuses.filter((p) => p.status !== 'not_started').length,
    firstDate: [metrics.data?.firstFocusAt, ...evidence.map((e) => e.createdAt)].filter(Boolean).sort()[0],
  }
}
