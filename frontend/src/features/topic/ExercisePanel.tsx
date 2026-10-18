import { useState, type FormEvent } from 'react'
import { useStartAttempt, useUpdateAttempt } from '../../api/queries'
import type { Attempt, Stage, Topic } from '../../api/types'
import { TextArea, TextField } from '../../components/Field'
import { InlineMarkdown } from '../../components/Markdown'
import { MarkdownEditor } from '../../components/MarkdownEditor'
import { ErrorMessage } from '../../components/Status'
import { AiHelper } from './AiHelper'

const STATUS_LABEL: Record<Attempt['status'], string> = {
  in_progress: 'Em andamento',
  submitted: 'Enviada',
  abandoned: 'Abandonada',
}

export function ExercisePanel({ topic, stage, attempts }: { topic: Topic; stage: Stage; attempts: Attempt[] }) {
  const active = attempts.find((a) => a.status === 'in_progress')
  const past = attempts.filter((a) => a !== active)
  return (
    <section className="panel stack" aria-labelledby="exercise-panel-title">
      <h2 id="exercise-panel-title">{active ? 'Tentativa em andamento' : 'Exercício'}</h2>
      {active ? <ActiveAttempt topic={topic} stage={stage} attempt={active} /> : <StartAttempt topic={topic} />}
      {past.length > 0 && (
        <details>
          <summary>Tentativas anteriores ({past.length})</summary>
          <ul className="list-plain details-body small">
            {past.map((a) => (
              <li key={a.id}>
                {STATUS_LABEL[a.status]}
                {a.prediction && <> — previsão: {a.prediction}</>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function StartAttempt({ topic }: { topic: Topic }) {
  const start = useStartAttempt()
  const [prediction, setPrediction] = useState('')
  // Tópicos planejados não têm exercício oficial; a pessoa nomeia a prática livre.
  const [freeName, setFreeName] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    start.mutate({
      topicId: topic.id,
      ...(topic.exercise ? {} : { exerciseId: freeName }),
      ...(prediction ? { prediction } : {}),
    })
  }

  return (
    <form onSubmit={submit} className="stack">
      {topic.exercise ? (
        <p className="small" style={{ margin: 0 }}>
          {topic.exercise.title}. Antes de qualquer ferramenta, escreva o que você espera.
        </p>
      ) : (
        <TextField
          label="Nome da prática"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          hint="Em kebab-case, ex.: explorar-dig"
          value={freeName}
          onChange={(e) => setFreeName(e.target.value)}
        />
      )}
      <TextArea
        label="Sua previsão"
        placeholder="Eu espero que… porque…"
        rows={3}
        hint={topic.exercise ? <InlineMarkdown text={topic.exercise.prediction} /> : undefined}
        value={prediction}
        onChange={(e) => setPrediction(e.target.value)}
      />
      <ErrorMessage error={start.error} />
      <button type="submit" disabled={start.isPending}>
        Começar exercício
      </button>
      <p className="hint">Comece o exercício e escreva sua previsão antes de pedir ajuda a uma IA.</p>
    </form>
  )
}

function ActiveAttempt({ topic, stage, attempt }: { topic: Topic; stage: Stage; attempt: Attempt }) {
  const update = useUpdateAttempt()
  const [notes, setNotes] = useState(attempt.notes ?? '')
  const [ai, setAi] = useState(attempt.aiAssistance ?? '')

  function save(status?: Attempt['status']) {
    update.mutate({ id: attempt.id, notes, aiAssistance: ai || undefined, ...(status ? { status } : {}) })
  }

  return (
    <>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        {attempt.prediction && (
          <p className="small" style={{ margin: 0 }}>
            <span className="muted">Sua previsão:</span> {attempt.prediction}
          </p>
        )}
        <MarkdownEditor
          label="Anotações"
          placeholder="O que aconteceu de fato, com a saída real"
          rows={6}
          hint="O que aconteceu de fato? Onde a previsão errou?"
          value={notes}
          onChange={setNotes}
        />
        <TextArea
          label="Assistência de IA (se houve)"
          placeholder="Ex.: pedi para explicar a mensagem de erro"
          rows={2}
          hint="Registre ajuda significativa: o que pediu e como validou."
          value={ai}
          onChange={(e) => setAi(e.target.value)}
        />
        <ErrorMessage error={update.error} />
        <div className="row">
          <button type="submit" className="button-secondary" disabled={update.isPending}>
            Salvar anotações
          </button>
          <button type="button" onClick={() => save('submitted')} disabled={update.isPending}>
            Marcar como enviada
          </button>
        </div>
      </form>
      <AiHelper topic={topic} stage={stage} attempt={{ ...attempt, aiAssistance: ai || undefined }} onRecorded={setAi} />
    </>
  )
}
