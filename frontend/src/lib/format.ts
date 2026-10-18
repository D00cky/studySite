import type { ProgressStatus } from '../api/types'

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' })

export const formatDateTime = (iso?: string) => (iso ? dateTime.format(new Date(iso)) : '')
export const formatDate = (iso?: string) => (iso ? date.format(new Date(`${iso.length === 10 ? `${iso}T12:00:00` : iso}`)) : '')

export const PROGRESS_LABEL: Record<ProgressStatus, string> = {
  not_started: 'Não iniciado',
  exploring: 'Explorando',
  practicing: 'Praticando',
  evidence: 'Com evidência',
  demonstrated: 'Demonstrado',
}

export const PROGRESS_TONE: Record<ProgressStatus, string> = {
  not_started: '',
  exploring: 'tag-accent',
  practicing: 'tag-accent',
  evidence: 'tag-warning',
  demonstrated: 'tag-success',
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** 250 → "4h10", 50 → "50 min". */
export function formatMinutes(total: number) {
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
