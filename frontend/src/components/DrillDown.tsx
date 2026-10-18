import type { DeepDivePoint, KitItem, Resource } from '../api/types'
import { InlineMarkdown } from './Markdown'

/**
 * Kit mínimo 80/20 em forma de script de terminal: o comando/conceito e, como
 * comentário, para que serve no dia a dia.
 */
export function Kit({ items, compact = false }: { items: KitItem[]; compact?: boolean }) {
  if (items.length === 0) return null
  const id = compact ? 'kit-drawer' : 'kit-title'
  return (
    <section className={`terminal kit${compact ? ' kit-compact' : ''}`} aria-labelledby={id}>
      <div className="terminal-bar" aria-hidden="true">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">kit.sh</span>
      </div>
      <div className="terminal-body">
        {compact ? (
          <h3 id={id}>Kit mínimo</h3>
        ) : (
          <h2 id={id}>
            Kit mínimo <span className="kit-badge">20% → 80%</span>
          </h2>
        )}
        {!compact && (
          <p className="terminal-comment"># com isto você já começa e resolve a maior parte do dia a dia; o resto vem com o tempo</p>
        )}
        <ul className="kit-list">
          {items.map((k) => (
            <li key={k.term}>
              <code className="kit-term">{k.term}</code>
              <span className="kit-use"># {k.use}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Camada 2: aprofundamento para depois — mapeado, não escondido. */
export function DeepDive({ points, resources }: { points: DeepDivePoint[]; resources: Resource[] }) {
  if (points.length === 0) return null
  const byId = new Map(resources.map((r) => [r.id, r]))
  return (
    <details className="deep-dive">
      <summary>Aprofundamento — para depois ({points.length})</summary>
      <div className="details-body">
        <p className="hint">Assuntos que valem a pena quando o essencial estiver firme ou quando o problema pedir.</p>
        <ul className="list-plain">
          {points.map((p) => {
            const r = p.resource ? byId.get(p.resource) : undefined
            return (
              <li key={p.title}>
                <strong>{p.title}</strong>
                <div className="small">
                  <span className="muted">Quando: </span>
                  <InlineMarkdown text={p.why} />
                </div>
                {r && (
                  <div className="small">
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {r.title}
                      <span className="visually-hidden"> (abre em nova aba)</span>
                    </a>{' '}
                    <span className="muted">— {r.author}</span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </details>
  )
}
