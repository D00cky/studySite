import type { Resource, ReviewStatus, Role, SessionRoleId, Verdict } from '../api/types'

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  open: 'Aberta',
  changes_requested: 'Mudanças pedidas',
  accepted: 'Aprovada',
  closed: 'Encerrada',
}

export const REVIEW_STATUS_TONE: Record<ReviewStatus, string> = {
  open: 'tag-accent',
  changes_requested: 'tag-warning',
  accepted: 'tag-success',
  closed: '',
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  comment: 'Comentário',
  changes_requested: 'Pediu mudanças',
  accepted: 'Aprovou',
}

export const ROLE_LABEL: Record<Role, string> = { mentor: 'Mentor(a)', learner: 'Aprendiz' }

export const SESSION_ROLE_LABEL: Record<SessionRoleId, string> = {
  author: 'Autor(a)',
  challenger: 'Desafiante',
  reviewer: 'Revisor(a)',
  synthesizer: 'Sintetizador(a)',
}

export const FORMAT_LABEL: Record<Resource['format'], string> = {
  book: 'Livro',
  article: 'Artigo',
  course: 'Curso',
  documentation: 'Documentação',
  video: 'Vídeo',
  tool: 'Ferramenta',
  lab: 'Laboratório',
}
export const DIFFICULTY_LABEL: Record<Resource['difficulty'], string> = {
  intro: 'Introdutório',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}
export const ACCESS_LABEL: Record<Resource['access'], string> = { free: 'Gratuito', paid: 'Pago', mixed: 'Parcialmente gratuito' }
