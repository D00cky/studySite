import type { DeepDivePoint, Resource } from '../api/types'
import { InlineMarkdown } from './Markdown'

/** Camada 1 do drill-down: os 20% que resolvem 80% dos casos. */
export function Essentials({ items, compact = false }: { items: string[]; compact?: boolean }) {
  if (items.length === 0) return null
  const Heading = compact ? 'h3' : 'h2'
  return (
    <section className={`essentials${compact ? ' essentials-compact' : ''}`} aria-labelledby={compact ? 'ess-drawer' : 'ess-title'}>
      <Heading id={compact ? 'ess-drawer' : 'ess-title'}>
        O essencial <span className="essentials-badge">20/80</span>
      </Heading>
      {!compact && <p className="hint">O que resolve a maioria dos casos. Domine isto antes de seguir; o resto pode esperar.</p>}
      <ol>
        {items.map((item) => (
          <li key={item}>
            <InlineMarkdown text={item} />
          </li>
        ))}
      </ol>
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
