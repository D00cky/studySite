import { useEffect, useRef, useState } from 'react'
import { useFocusCalendar } from '../../api/queries'
import { formatMinutes, plural } from '../../lib/format'

const DAY = 86_400_000
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const WEEKDAY_LABELS = ['Seg', '', 'Qua', '', 'Sex', '', '']

// Datas como dias UTC à meia-noite: o servidor já agrupou no fuso de quem pede.
const toMs = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const brDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
/** 0 = sem estudo; 1 até 24 min; 2 até 49; 3 até 99; 4 a partir de 100 min. */
const level = (minutes: number) => (minutes <= 0 ? 0 : minutes < 25 ? 1 : minutes < 50 ? 2 : minutes < 100 ? 3 : 4)

/**
 * Calendário de estudo no estilo do GitHub: um quadrado por dia, mais escuro quanto mais
 * tempo de foco. Mostra quantos dias tiveram estudo, nunca "dias seguidos".
 */
export function StudyCalendar() {
  const [year, setYear] = useState<number | null>(null)
  const { data } = useFocusCalendar(year)

  return (
    <section className="panel calendar-panel" aria-labelledby="calendar-title">
      <div className="calendar-head">
        <h2 id="calendar-title">Calendário de estudo</h2>
        <div className="segmented" role="group" aria-label="Período do calendário">
          <button type="button" aria-pressed={year === null} onClick={() => setYear(null)}>
            Últimos 12 meses
          </button>
          {[...(data?.years ?? [])].reverse().map((y) => (
            <button key={y} type="button" aria-pressed={year === y} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </div>
      </div>
      {data && <CalendarGrid from={data.from} to={data.to} days={data.days} />}
    </section>
  )
}

function CalendarGrid({ from, to, days }: { from: string; to: string; days: { date: string; minutes: number }[] }) {
  const minutesByDay = new Map(days.map((d) => [d.date, d.minutes]))
  const first = toMs(from)
  const last = toMs(to)
  // Semanas de segunda a domingo cobrindo o período inteiro.
  const start = first - ((new Date(first).getUTCDay() + 6) % 7) * DAY
  const weeks = Math.ceil((last - start + DAY) / (7 * DAY))
  const cells: { iso: string; inRange: boolean }[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const ms = start + i * DAY
    cells.push({ iso: toIso(ms), inRange: ms >= first && ms <= last })
  }
  const months: { label: string; column: number }[] = []
  for (let w = 0; w < weeks; w++) {
    const week = cells.slice(w * 7, w * 7 + 7).filter((c) => c.inRange)
    const firstOfMonth = week.find((c) => c.iso.endsWith('-01'))
    if (firstOfMonth || w === 0) {
      const ref = firstOfMonth ?? week[0]
      if (ref) months.push({ label: MONTHS[Number(ref.iso.slice(5, 7)) - 1]!, column: w + 1 })
    }
  }
  const scroller = useRef<HTMLDivElement>(null)
  // Em telas estreitas, abre já mostrando as semanas mais recentes (à direita).
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [from, to])
  const studied = days.filter((d) => d.minutes > 0)
  const total = studied.reduce((sum, d) => sum + d.minutes, 0)
  const summary = `${plural(studied.length, 'dia com estudo', 'dias com estudo')}, ${formatMinutes(total)} de foco`

  return (
    <>
      <p className="calendar-summary">
        <strong>{plural(studied.length, 'dia', 'dias')}</strong> com estudo · <strong>{formatMinutes(total)}</strong> de foco
        no período
      </p>
      <div className="calendar-scroll" ref={scroller} tabIndex={0} role="group" aria-label="Dias do calendário">
        <div className="calendar" style={{ ['--weeks' as string]: weeks }}>
          <div className="calendar-months" aria-hidden="true">
            {months.map((m) => (
              <span key={`${m.label}-${m.column}`} style={{ gridColumn: m.column }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid" role="img" aria-label={`Calendário de estudo: ${summary}`}>
            {cells.map((c) => {
              if (!c.inRange) return <span key={c.iso} className="calendar-cell out" />
              const minutes = minutesByDay.get(c.iso) ?? 0
              return (
                <span
                  key={c.iso}
                  className="calendar-cell"
                  data-level={level(minutes)}
                  title={minutes > 0 ? `${formatMinutes(minutes)} em ${brDate(c.iso)}` : `Sem estudo em ${brDate(c.iso)}`}
                />
              )
            })}
          </div>
        </div>
      </div>
      <div className="calendar-legend" aria-hidden="true">
        <span>menos</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="calendar-cell" data-level={l} />
        ))}
        <span>mais</span>
      </div>
    </>
  )
}
