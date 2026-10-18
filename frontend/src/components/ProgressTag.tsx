import type { ProgressStatus } from '../api/types'
import { PROGRESS_LABEL, PROGRESS_TONE } from '../lib/format'

export function ProgressTag({ status }: { status: ProgressStatus }) {
  return <span className={`tag ${PROGRESS_TONE[status]}`}>{PROGRESS_LABEL[status]}</span>
}
