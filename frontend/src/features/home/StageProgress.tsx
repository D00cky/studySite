import type { Roadmap, TopicProgress } from '../../api/types'

/** Painel "status" do núcleo: tópicos demonstrados em revisão sobre o total, por etapa. */
export function StageProgress({ roadmap, progress }: { roadmap: Roadmap; progress: Record<string, TopicProgress> }) {
  const stages = roadmap.stages.filter((s) => s.kind === 'core').sort((a, b) => a.order - b.order)
  return (
    <section className="terminal" aria-labelledby="stage-progress-title">
      <div className="terminal-bar" aria-hidden="true">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">progresso.log</span>
      </div>
      <div className="terminal-body">
        <h2 id="stage-progress-title">Progresso por etapa</h2>
        <ol className="stage-progress">
          {stages.map((stage) => {
            const topics = roadmap.topics.filter((t) => t.stage === stage.id)
            const done = topics.filter((t) => progress[t.id]?.status === 'demonstrated').length
            const started = topics.filter((t) => progress[t.id] && progress[t.id].status !== 'not_started').length
            const label = `${String(stage.order).padStart(2, '0')} ${stage.title}`
            return (
              <li key={stage.id}>
                <span className="stage-progress-name">{label}</span>
                <div
                  className="meter"
                  role="progressbar"
                  aria-label={`${stage.title}: tópicos demonstrados`}
                  aria-valuemin={0}
                  aria-valuemax={topics.length}
                  aria-valuenow={done}
                  aria-valuetext={`${done} de ${topics.length} demonstrados, ${started} iniciados`}
                >
                  <span className="meter-started" style={{ width: pct(started, topics.length) }} />
                  <span className="meter-done" style={{ width: pct(done, topics.length) }} />
                </div>
                <span className="stage-progress-count">
                  {done}/{topics.length}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="terminal-comment">
          # barra cheia = demonstrado em revisão · barra clara = iniciado. Sem sequências nem metas diárias.
        </p>
      </div>
    </section>
  )
}

function pct(n: number, total: number) {
  return total === 0 ? '0%' : `${Math.round((n / total) * 100)}%`
}
