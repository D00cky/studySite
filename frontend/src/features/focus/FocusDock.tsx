import { useEffect, useRef, useState } from 'react'
import { useMatch } from 'react-router'
import { useCurrentFocus, useStartFocus, useUpdateFocus } from '../../api/queries'
import type { FocusBlock } from '../../api/types'
import { ErrorMessage } from '../../components/Status'
import { useTopicTitles } from '../../lib/useTopicTitles'

const DURATIONS = [15, 20, 25, 40, 50]
const LAST_KEY = 'studysite-focus-minutes'
const SOUND_KEY = 'studysite-focus-sound'

function stored(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback // localStorage pode falhar (modo privado)
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // preferência só desta visita
  }
}

const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const endsAt = (b: FocusBlock) => new Date(b.startedAt).getTime() + b.plannedMinutes * 60_000

/** Um "plim" curto ao fim do bloco, gerado na hora (sem arquivo de áudio). */
function chime() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.8)
  } catch {
    // sem áudio disponível
  }
}

type Notice = { text: string; next: 'break' | 'focus' }

/**
 * Pomodoro fixo no canto da tela, presente em todas as páginas. O servidor guarda o
 * bloco (começo e duração), então ele sobrevive a navegação, recarga e outra aba.
 * Parar antes da hora conta o tempo feito: 20 ou 40 minutos valem igual.
 */
export function FocusDock() {
  const { data: current } = useCurrentFocus()
  const start = useStartFocus()
  const update = useUpdateFocus()
  const topicTitle = useTopicTitles()
  const topicId = useMatch('/topicos/:topicId')?.params.topicId
  const [now, setNow] = useState(() => Date.now())
  const [picking, setPicking] = useState(false)
  const [minutes, setMinutes] = useState(() => Number(stored(LAST_KEY, '25')) || 25)
  const [sound, setSound] = useState(() => stored(SOUND_KEY, 'on') === 'on')
  const [notice, setNotice] = useState<Notice | null>(null)
  const ending = useRef<string | null>(null)

  useEffect(() => {
    if (!current) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [current])

  const remaining = current ? endsAt(current) - now : 0

  // Fim do tempo: encerra no servidor uma única vez e oferece o próximo passo.
  useEffect(() => {
    if (!current || remaining > 0 || ending.current === current.id) return
    ending.current = current.id
    update.mutate(
      { id: current.id, end: true },
      {
        onSuccess: () => {
          if (sound) chime()
          setNotice(
            current.kind === 'focus'
              ? { text: `Bloco concluído: ${current.plannedMinutes} min de foco.`, next: 'break' }
              : { text: 'Pausa concluída.', next: 'focus' },
          )
        },
      },
    )
  }, [current, remaining, update, sound])

  // Tempo restante no título da aba, para acompanhar de outra janela.
  useEffect(() => {
    if (!current) return
    const original = document.title
    document.title = `(${clock(remaining)}) ${current.kind === 'focus' ? 'Foco' : 'Pausa'} · StudySite`
    return () => {
      document.title = original
    }
  }, [current, remaining])

  function begin(kind: FocusBlock['kind'], planned: number) {
    if (kind === 'focus') store(LAST_KEY, String(planned))
    setNotice(null)
    setPicking(false)
    start.mutate({ kind, plannedMinutes: planned, ...(kind === 'focus' && topicId ? { topicId } : {}) })
  }

  function stop(block: FocusBlock) {
    ending.current = block.id
    const done = Math.min(block.plannedMinutes, Math.floor((now - new Date(block.startedAt).getTime()) / 60_000))
    update.mutate(
      { id: block.id, end: true },
      {
        onSuccess: () =>
          setNotice(
            block.kind === 'focus'
              ? { text: `Bloco encerrado: ${done} min de foco contam no seu progresso.`, next: 'break' }
              : { text: 'Pausa encerrada.', next: 'focus' },
          ),
      },
    )
  }

  function toggleSound() {
    store(SOUND_KEY, sound ? 'off' : 'on')
    setSound(!sound)
  }

  const running = current && remaining > 0
  const progress = current ? 1 - remaining / (current.plannedMinutes * 60_000) : 0

  return (
    <section
      className={`focus-dock ${running ? 'running' : picking ? 'picking' : notice ? 'noticing' : 'idle'}${current?.kind === 'break' ? ' on-break' : ''}`}
      aria-label="Pomodoro"
    >
      {running ? (
        <div className="focus-running">
          <div className="focus-head">
            <span className="focus-kind">{current.kind === 'focus' ? 'Foco' : 'Pausa'}</span>
            <span className="focus-time">{clock(remaining)}</span>
          </div>
          <div className="focus-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }} />
          </div>
          {current.topicId && <p className="focus-topic">{topicTitle(current.topicId)}</p>}
          <div className="focus-actions">
            <button
              type="button"
              className="button-quiet"
              disabled={update.isPending || current.plannedMinutes + 5 > 180}
              onClick={() => update.mutate({ id: current.id, plannedMinutes: current.plannedMinutes + 5 })}
            >
              +5 min
            </button>
            <button type="button" className="button-quiet" disabled={update.isPending} onClick={() => stop(current)}>
              Encerrar bloco
            </button>
          </div>
        </div>
      ) : picking ? (
        <div className="focus-picker">
          <fieldset>
            <legend>Duração do bloco</legend>
            <div className="focus-durations">
              {DURATIONS.map((d) => (
                <label key={d} className="focus-duration">
                  <input type="radio" name="focus-minutes" checked={minutes === d} onChange={() => setMinutes(d)} />
                  <span>{d} min</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="focus-hint">
            {topicId ? `Ligado a: ${topicTitle(topicId)}` : 'Abra um tópico antes para ligar o tempo a ele.'}
          </p>
          <div className="focus-actions">
            <button type="button" onClick={() => begin('focus', minutes)} disabled={start.isPending}>
              Começar
            </button>
            <button type="button" className="button-quiet" onClick={() => setPicking(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="focus-idle">
          {notice && (
            <div className="focus-notice">
              <p className="success">{notice.text}</p>
              <div className="focus-actions">
                {notice.next === 'break' ? (
                  <button type="button" className="button-quiet" onClick={() => begin('break', 5)}>
                    Pausa de 5 min
                  </button>
                ) : null}
                <button type="button" className="button-quiet" onClick={() => begin('focus', minutes)}>
                  {notice.next === 'break' ? 'Mais um bloco' : 'Voltar ao foco'}
                </button>
              </div>
            </div>
          )}
          <div className="focus-actions">
            <button type="button" className="focus-start" onClick={() => setPicking(true)}>
              Iniciar foco
            </button>
            <button type="button" className="button-quiet focus-sound" aria-pressed={sound} onClick={toggleSound}>
              Som
            </button>
          </div>
        </div>
      )}
      <ErrorMessage error={start.error ?? update.error} />
    </section>
  )
}
