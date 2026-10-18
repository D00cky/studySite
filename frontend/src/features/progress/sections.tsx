import { Link } from 'react-router'
import type { Evidence, Metrics, Roadmap } from '../../api/types'
import { InlineMarkdown } from '../../components/Markdown'
import { EmptyState } from '../../components/Status'
import { formatDate, formatMinutes, plural } from '../../lib/format'

const WEEKDAYS = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']

const argmax = (xs: number[]) => xs.reduce((best, x, i) => (x > xs[best]! ? i : best), 0)
/** "2026-10-12" → "12/10", sem passar por Date (evita deslocar o dia pelo fuso). */
const dayMonth = (isoDate: string) => isoDate.slice(8, 10) + '/' + isoDate.slice(5, 7)

type TopicTitle = (id?: string) => string

export function Journey({
  roadmap,
  nextTopic,
  nextText,
  firstDate,
  demonstrated,
  started,
  topicTitle,
}: {
  roadmap?: Roadmap
  nextTopic?: string
  /** Texto da próxima ação; a home omite porque já mostra a ação logo acima. */
  nextText?: string
  firstDate?: string
  demonstrated: number
  started: number
  topicTitle: TopicTitle
}) {
  const core = roadmap?.stages.filter((s) => s.kind === 'core').sort((a, b) => a.order - b.order) ?? []
  const topics = roadmap?.topics ?? []
  const current = topics.find((t) => t.id === nextTopic)
  const stage = roadmap?.stages.find((s) => s.id === current?.stage) ?? core[0]
  // "E depois?": o tópico seguinte na ordem do roadmap.
  const index = topics.findIndex((t) => t.id === nextTopic)
  const after = index >= 0 ? topics[index + 1] : undefined
  return (
    <section className="terminal journey" aria-labelledby="journey-title">
      <div className="terminal-bar" aria-hidden="true">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">jornada.md</span>
      </div>
      <div className="terminal-body">
        <h2 id="journey-title">Do ponto A ao ponto B</h2>
        <ol className="journey-steps">
          <li>
            <span className="journey-label">ponto A</span>
            <span>
              {firstDate ? `Começou em ${formatDate(firstDate)}.` : 'Seu ponto A é hoje: o primeiro bloco de foco marca o começo.'}
            </span>
          </li>
          <li>
            <span className="journey-label">agora</span>
            <span>
              {stage ? `Etapa ${stage.order} de ${core.length}: ${stage.title}.` : 'Carregando a trilha…'}{' '}
              {plural(demonstrated, 'tópico demonstrado', 'tópicos demonstrados')}, {plural(started, 'iniciado', 'iniciados')} de{' '}
              {topics.length}.
            </span>
          </li>
          <li>
            <span className="journey-label">próximo</span>
            {nextTopic ? (
              <span>
                {nextText && (
                  <>
                    <InlineMarkdown text={nextText} />{' '}
                  </>
                )}
                <Link to={`/topicos/${nextTopic}`}>Abrir {topicTitle(nextTopic)}</Link>
              </span>
            ) : (
              <Link to="/roadmap">Escolher um tópico na trilha</Link>
            )}
          </li>
          {after && (
            <li>
              <span className="journey-label">depois</span>
              <Link to={`/topicos/${after.id}`}>{after.title}</Link>
            </li>
          )}
          <li>
            <span className="journey-label">ponto B</span>
            <span>
              Etapa {core.length}: {core[core.length - 1]?.title ?? '…'}. Não importa o ritmo, cada bloco aproxima.
            </span>
          </li>
        </ol>
      </div>
    </section>
  )
}

export function StudyTime({ metrics }: { metrics: Metrics }) {
  const maxWeek = Math.max(1, ...metrics.weeks.map((w) => w.minutes))
  return (
    <section className="panel" aria-labelledby="time-title">
      <h2 id="time-title">Tempo estudado</h2>
      {metrics.focusBlocks === 0 ? (
        <EmptyState title="Nenhum bloco de foco ainda">
          Use o botão “Iniciar foco” no canto da tela. Cada bloco, mesmo interrompido, entra aqui.
        </EmptyState>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat">
              <strong>{formatMinutes(metrics.thisWeekMinutes)}</strong>
              <span>nesta semana</span>
            </div>
            <div className="stat">
              <strong>{formatMinutes(metrics.totalMinutes)}</strong>
              <span>no total, em {plural(metrics.focusBlocks, 'bloco', 'blocos')}</span>
            </div>
          </div>
          <ol className="week-bars" aria-label="Minutos por semana">
            {metrics.weeks.map((w) => (
              <li key={w.weekStart}>
                <span className="week-bar" aria-hidden="true">
                  <span style={{ height: `${Math.round((w.minutes / maxWeek) * 100)}%` }} />
                </span>
                <span className="visually-hidden">
                  semana de {dayMonth(w.weekStart)}: {formatMinutes(w.minutes)}
                </span>
                <span className="week-label" aria-hidden="true">
                  {dayMonth(w.weekStart)}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

export function Pattern({ metrics }: { metrics: Metrics }) {
  const hour = argmax(metrics.byHour)
  const weekday = argmax(metrics.byWeekday)
  return (
    <section className="panel" aria-labelledby="pattern-title">
      <h2 id="pattern-title">Seu padrão</h2>
      <dl className="kv">
        <dt>Bloco típico</dt>
        <dd>{metrics.medianBlockMinutes} min</dd>
        <dt>Rende mais</dt>
        <dd>por volta das {hour}h</dd>
        <dt>Dia com mais estudo</dt>
        <dd>{WEEKDAYS[weekday]}</dd>
      </dl>
      <div className="hour-strip" aria-hidden="true">
        {metrics.byHour.map((v, h) => (
          <span key={h} style={{ opacity: 0.15 + 0.85 * (v / Math.max(1, ...metrics.byHour)) }} title={`${h}h`} />
        ))}
      </div>
      <p className="hint">Use isso para marcar estudo nos horários em que você já rende, em vez de lutar contra eles.</p>
    </section>
  )
}

export function TopicTime({ metrics, topicTitle }: { metrics: Metrics; topicTitle: TopicTitle }) {
  if (metrics.topics.length === 0) return null
  const maxTopic = Math.max(1, ...metrics.topics.map((t) => t.minutes))
  return (
    <section className="panel" aria-labelledby="topic-time-title">
      <h2 id="topic-time-title">Tempo por tópico</h2>
      <ul className="topic-time">
        {metrics.topics.map((t) => (
          <li key={t.topicId}>
            <Link to={`/topicos/${t.topicId}`}>{topicTitle(t.topicId)}</Link>
            <span className="topic-time-bar" aria-hidden="true">
              <span style={{ width: `${Math.round((t.minutes / maxTopic) * 100)}%` }} />
            </span>
            <span className="topic-time-value">{formatMinutes(t.minutes)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Built({
  evidence,
  demonstrated,
  topicTitle,
  limit,
}: {
  evidence: Evidence[]
  demonstrated: string[]
  topicTitle: TopicTitle
  /** Na home, só os mais recentes; a página de progresso mostra tudo. */
  limit?: number
}) {
  const built = evidence.filter((e) => e.kind !== 'text' || e.url)
  const shown = limit ? built.slice(0, limit) : built
  return (
    <section className="panel" aria-labelledby="built-title">
      <h2 id="built-title">O que você já construiu</h2>
      {built.length === 0 && demonstrated.length === 0 ? (
        <EmptyState title="Nada registrado ainda" action={{ to: '/projetos', label: 'Ver projetos' }}>
          Repositórios e artefatos que você registrar como evidência aparecem aqui.
        </EmptyState>
      ) : (
        <>
          {shown.length > 0 && (
            <ul className="list-plain">
              {shown.map((e) => (
                <li key={e.id}>
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noopener noreferrer">
                      {e.title}
                    </a>
                  ) : (
                    <strong>{e.title}</strong>
                  )}
                  <span className="muted small">
                    {' '}
                    · {e.topicId ? topicTitle(e.topicId) : 'projeto'} · {formatDate(e.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {limit && built.length > limit && <p className="muted small">+{built.length - limit} no progresso detalhado.</p>}
          {demonstrated.length > 0 && (
            <>
              <h3>Demonstrado em revisão</h3>
              <ul className="chip-list">
                {demonstrated.map((id) => (
                  <li key={id}>
                    <Link className="chip" to={`/topicos/${id}`}>
                      {topicTitle(id)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  )
}
