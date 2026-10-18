import { usePolicies } from '../../api/queries'
import { ErrorMessage, Loading } from '../../components/Status'

export function PoliciesPage() {
  const { data, error, isPending } = usePolicies()
  if (isPending) return <Loading />
  if (error) return <ErrorMessage error={error} />
  return (
    <div className="prose">
      <h1>Como estudamos</h1>

      <section aria-labelledby="loop-title">
        <h2 id="loop-title">Ciclo de aprendizagem</h2>
        <ol>
          {data.learningLoop.map((s) => (
            <li key={s.id}>
              <strong>{s.title}.</strong> {s.description}
            </li>
          ))}
        </ol>
      </section>

      {data.practiceMethod && (
        <section id="pratica" aria-labelledby="practice-method-title">
          <h2 id="practice-method-title">{data.practiceMethod.title}</h2>
          <p>{data.practiceMethod.summary}</p>
          <ol>
            {data.practiceMethod.steps.map((s) => (
              <li key={s.id}>
                <strong>{s.title}</strong> — {s.description}
              </li>
            ))}
          </ol>
          <h3>De onde vem</h3>
          <ul className="quote-list">
            {data.practiceMethod.sources.map((src) => (
              <li key={src.url}>
                <blockquote>“{src.quote}”</blockquote>
                <a href={src.url} target="_blank" rel="noopener noreferrer">
                  {src.title}
                </a>
              </li>
            ))}
          </ul>
          <h3>Cuidados</h3>
          <ul>
            {data.practiceMethod.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="records-title">
        <h2 id="records-title">Registros separados</h2>
        <ul>
          {data.recordKinds.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ai-title">
        <h2 id="ai-title">Política de IA</h2>
        {data.aiPolicy.map((phase) => (
          <div key={phase.id}>
            <h3>{phase.title}</h3>
            <ul>
              {phase.allowed.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="muted small" style={{ marginBottom: '0.3rem' }}>
              Combinados:
            </p>
            <ul>
              {phase.expectations.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="modes-title">
        <h2 id="modes-title">Rotina flexível</h2>
        <p>Retome da última habilidade demonstrada e da sua nota de retomada. Sem sequências, sem penalidades.</p>
        <dl className="kv">
          {data.weeklyModes.map((m) => (
            <div key={m.id} style={{ display: 'contents' }}>
              <dt>{m.title}</dt>
              <dd>
                {m.time}. {m.description}
                {!m.completesMilestones && ' Não conclui marcos de aprendizagem.'}
              </dd>
            </div>
          ))}
        </dl>
        <h3>Uma sessão de 25 minutos</h3>
        <ol>
          {data.sessionTemplate.map((s) => (
            <li key={s.title}>
              <strong>{s.title}</strong> ({s.minutes} min) — {s.description}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="roles-title">
        <h2 id="roles-title">Papéis nas sessões do time</h2>
        <ul>
          {data.sessionRoles.map((r) => (
            <li key={r.id}>
              <strong>{r.title}:</strong> {r.description}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="levels-title">
        <h2 id="levels-title">Níveis de autoavaliação</h2>
        <ol start={0}>
          {data.selfAssessmentLevels.map((l) => (
            <li key={l.level}>
              <strong>{l.title}</strong>
              {l.description && <> — {l.description}</>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
