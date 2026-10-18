import { useState, type FormEvent } from 'react'
import { useAddSelfAssessment, usePolicies } from '../../api/queries'
import type { SelfAssessment } from '../../api/types'
import { TextField } from '../../components/Field'
import { ErrorMessage } from '../../components/Status'
import { formatDate } from '../../lib/format'

export function SelfAssessmentPanel({ topicId, history }: { topicId: string; history: SelfAssessment[] }) {
  const { data: policies } = usePolicies()
  const add = useAddSelfAssessment()
  const latest = history[0]
  const [level, setLevel] = useState<number | null>(null)
  const [note, setNote] = useState('')

  if (!policies) return null

  function submit(e: FormEvent) {
    e.preventDefault()
    if (level === null) return
    add.mutate({ topicId, level, ...(note ? { note } : {}) }, { onSuccess: () => setNote('') })
  }

  return (
    <form className="panel stack" onSubmit={submit} aria-labelledby="self-title">
      <h2 id="self-title">Autoavaliação</h2>
      {latest && (
        <p className="muted small" style={{ margin: 0 }}>
          Última: {policies.selfAssessmentLevels.find((l) => l.level === latest.level)?.title} em{' '}
          {formatDate(latest.createdAt)}
        </p>
      )}
      <fieldset>
        <legend>Como você avalia seu entendimento?</legend>
        {policies.selfAssessmentLevels.map((l) => (
          <label key={l.level} className="choice small">
            <input type="radio" name="level" value={l.level} checked={level === l.level} onChange={() => setLevel(l.level)} />
            <span>
              {l.level} — {l.title}
              {l.description && <span className="muted"> · {l.description}</span>}
            </span>
          </label>
        ))}
      </fieldset>
      <TextField label="Comentário (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <ErrorMessage error={add.error} />
      <button type="submit" className="button-secondary" disabled={level === null || add.isPending}>
        Salvar autoavaliação
      </button>
      {add.isSuccess && <p className="success small">Autoavaliação registrada.</p>}
    </form>
  )
}
