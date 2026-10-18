import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ReviewThread } from '../../api/types'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const thread: ReviewThread = {
  request: {
    id: 'r1', groupId: 'g1', evidenceId: 'e1', evidenceTitle: 'Etapas do pipeline', topicId: 'compilation-pipeline',
    requesterId: 'u-lia', requesterName: 'Lia', question: 'Minha explicação do linking está certa?', status: 'open',
    createdAt: '2026-10-18T10:00:00Z', updatedAt: '2026-10-18T10:00:00Z',
  },
  evidence: {
    id: 'e1', userId: 'u-lia', authorName: 'Lia', groupId: 'g1', topicId: 'compilation-pipeline', kind: 'repository',
    title: 'Etapas do pipeline', body: 'Saídas de file e nm', url: 'https://example.test/repo',
    aiAssistance: 'Pedi explicação do erro de linking.', visibility: 'group', createdAt: '', updatedAt: '',
  },
  feedback: [
    { id: 'f1', authorId: 'u-gabriel', authorName: 'Gabriel', authorRole: 'mentor', verdict: 'changes_requested', body: 'Explique por que sem_main.c compila com -c.', createdAt: '2026-10-18T11:00:00Z' },
  ],
}

function setup(asUser: 'u-lia' | 'u-gabriel', t: ReviewThread = thread) {
  server.use(...signedIn(asUser === 'u-gabriel' ? { id: 'u-gabriel', displayName: 'Gabriel' } : {}))
  server.use(http.get('/api/review-requests/r1', () => HttpResponse.json(t)))
}

describe('revisão', () => {
  it('mostra a evidência, a pergunta, a assistência de IA e o histórico de feedback', async () => {
    setup('u-gabriel')
    renderApp('/revisoes/r1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Etapas do pipeline' })).toBeInTheDocument()
    expect(screen.getByText('Minha explicação do linking está certa?')).toBeInTheDocument()
    expect(screen.getByText('Saídas de file e nm')).toBeInTheDocument()
    expect(screen.getByText('Pedi explicação do erro de linking.')).toBeInTheDocument()
    const history = screen.getByRole('region', { name: 'Feedback' })
    expect(within(history).getByText(/Gabriel/)).toBeInTheDocument()
    expect(within(history).getByText('Pediu mudanças')).toBeInTheDocument()
  })

  it('quem revisa pode aprovar', async () => {
    let body: unknown
    setup('u-gabriel')
    server.use(
      http.post('/api/review-requests/r1/feedback', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...thread, request: { ...thread.request, status: 'accepted' } }, { status: 201 })
      }),
    )
    const { user } = renderApp('/revisoes/r1')
    await user.click(await screen.findByLabelText('Aprovar'))
    await user.type(screen.getByLabelText('Seu feedback'), 'Explicação correta.')
    await user.click(screen.getByRole('button', { name: 'Enviar feedback' }))
    expect(body).toEqual({ verdict: 'accepted', body: 'Explicação correta.' })
    expect(await screen.findByText('Aprovada')).toBeInTheDocument()
  })

  it('quem pediu só pode comentar', async () => {
    let body: unknown
    setup('u-lia')
    server.use(
      http.post('/api/review-requests/r1/feedback', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(thread, { status: 201 })
      }),
    )
    const { user } = renderApp('/revisoes/r1')
    await screen.findByLabelText('Seu feedback')
    expect(screen.queryByLabelText('Aprovar')).not.toBeInTheDocument()
    expect(screen.getByText(/não aprova o próprio trabalho/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Seu feedback'), 'Sem main, -c para antes do linking.')
    await user.click(screen.getByRole('button', { name: 'Responder' }))
    expect(body).toEqual({ verdict: 'comment', body: 'Sem main, -c para antes do linking.' })
  })

  it('permite assumir a revisão quando ninguém assumiu', async () => {
    let claimed = false
    setup('u-gabriel')
    server.use(
      http.post('/api/review-requests/r1/claim', () => {
        claimed = true
        return HttpResponse.json({ ...thread, request: { ...thread.request, reviewerId: 'u-gabriel', reviewerName: 'Gabriel' } })
      }),
    )
    const { user } = renderApp('/revisoes/r1')
    await user.click(await screen.findByRole('button', { name: 'Assumir revisão' }))
    expect(claimed).toBe(true)
    expect(await screen.findByText(/Revisora\/revisor: Gabriel/)).toBeInTheDocument()
  })

  it('pedido encerrado não aceita novo feedback', async () => {
    setup('u-gabriel', { ...thread, request: { ...thread.request, status: 'closed' } })
    renderApp('/revisoes/r1')
    expect(await screen.findByText('Encerrada')).toBeInTheDocument()
    expect(screen.queryByLabelText('Seu feedback')).not.toBeInTheDocument()
  })
})
