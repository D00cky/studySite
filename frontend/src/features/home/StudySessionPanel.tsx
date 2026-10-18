import { useState, type FormEvent } from 'react'
import { useMe, usePolicies, useSessions, useStartSession, useUpdateSession } from '../../api/queries'
import type { StudySession } from '../../api/types'
import { Select, TextArea, TextField } from '../../components/Field'
import { ErrorMessage } from '../../components/Status'
import { formatDateTime } from '../../lib/format'
import { useTopicTitles } from '../../lib/useTopicTitles'

/** Começar e encerrar sessões de estudo. Uma sessão aberta é a sem endedAt. */
export function StudySessionPanel({ topicId }: { topicId?: string }) {
  const { data: sessions } = useSessions()
  const active = sessions?.find((s) => !s.endedAt)
  return active ? <ActiveSession session={active} /> : <StartSession topicId={topicId} />
}

function StartSession({ topicId }: { topicId?: string }) {
  const { data: me } = useMe()
  const { data: policies } = usePolicies()
  const start = useStartSession()
  const [mode, setMode] = useState<string | undefined>()
  const selected = mode ?? me?.weeklyMode ?? 'compact'
  const modeInfo = policies?.weeklyModes.find((m) => m.id === selected)

  function submit(e: FormEvent) {
    e.preventDefault()
    start.mutate({ mode: selected, topicId })
  }

  if (!policies) return null

  return (
    <form className="panel stack" onSubmit={submit} aria-labelledby="start-session-title">
      <h2 id="start-session-title">Sessão de estudo</h2>
      <Select label="Modo da sessão" value={selected} onChange={(e) => setMode(e.target.value)}>
        {policies.weeklyModes.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title} — {m.time}
          </option>
        ))}
      </Select>
      {modeInfo && (
        <p className="hint">
          {modeInfo.description}
          {!modeInfo.completesMilestones && ' Uma sessão de resgate preserva o contato, mas não conclui marcos.'}
        </p>
      )}
      <ErrorMessage error={start.error} />
      <button type="submit" disabled={start.isPending}>
        Começar sessão
      </button>
    </form>
  )
}

function ActiveSession({ session }: { session: StudySession }) {
  const update = useUpdateSession()
  const topicTitle = useTopicTitles()
  const { data: policies } = usePolicies()
  const [form, setForm] = useState({ summary: '', restartNote: '', nextAction: '' })

  function submit(e: FormEvent) {
    e.preventDefault()
    update.mutate({ id: session.id, ...form, end: true })
  }

  return (
    <form className="panel stack" onSubmit={submit} aria-labelledby="active-session-title">
      <h2 id="active-session-title">Sessão em andamento</h2>
      <p className="muted small">
        Desde {formatDateTime(session.startedAt)}
        {session.topicId && <> · {topicTitle(session.topicId)}</>}
      </p>
      {policies && (
        <ol className="small">
          {policies.sessionTemplate.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong> ({step.minutes} min) — {step.description}
            </li>
          ))}
        </ol>
      )}
      <TextArea label="O que fiz" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
      <TextArea
        label="Nota de retomada"
        rows={2}
        hint="O que você precisa lembrar quando voltar."
        value={form.restartNote}
        onChange={(e) => setForm({ ...form, restartNote: e.target.value })}
      />
      <TextField
        label="Próxima ação ao voltar"
        hint="Pequena e concreta: um comando, um arquivo, uma pergunta."
        value={form.nextAction}
        onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
      />
      <ErrorMessage error={update.error} />
      <button type="submit" disabled={update.isPending}>
        Encerrar sessão
      </button>
    </form>
  )
}
