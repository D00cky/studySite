import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ContinueView, StudySession } from '../../api/types'
import { continueView } from '../../test/fixtures'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

function withSessions(sessions: StudySession[]) {
  return http.get('/api/me/study-sessions', () => HttpResponse.json(sessions))
}

function withContinue(view: Partial<ContinueView>) {
  return http.get('/api/me/continue', () => HttpResponse.json({ ...continueView, ...view }))
}

describe('painel continue de onde parou', () => {
  it('destaca uma única próxima ação com link para o tópico', async () => {
    server.use(...signedIn(), withSessions([]))
    renderApp('/')
    const next = await screen.findByRole('region', { name: 'Próxima ação' })
    expect(within(next).getByText('Rode echo $PATH e conte os diretórios.')).toBeInTheDocument()
    expect(within(next).getByRole('link', { name: /Terminal e shell/ })).toHaveAttribute('href', '/topicos/terminal-shell')
  })

  it('renderiza código inline na próxima ação em vez de crases cruas', async () => {
    server.use(...signedIn())
    server.use(
      withSessions([]),
      withContinue({ nextAction: { kind: 'start_topic', text: 'Rode `echo $PATH` e conte.', topicId: 'terminal-shell' } }),
    )
    renderApp('/')
    expect(await screen.findByText('echo $PATH', { selector: 'code' })).toBeInTheDocument()
    expect(screen.queryByText(/`/)).not.toBeInTheDocument()
  })

  it('mostra a nota de retomada deixada na última sessão', async () => {
    server.use(...signedIn())
    server.use(
      withSessions([]),
      withContinue({
        nextAction: { kind: 'restart_note', text: 'Rodar gcc sem_main.o', topicId: 'compilation-pipeline' },
        restartPoint: {
          id: 's1', mode: 'survival', topicId: 'compilation-pipeline', startedAt: '2026-10-17T10:00:00Z',
          endedAt: '2026-10-17T10:25:00Z', restartNote: 'Falta explicar o erro de linking', nextAction: 'Rodar gcc sem_main.o',
        },
      }),
    )
    renderApp('/')
    expect(await screen.findByText('Falta explicar o erro de linking')).toBeInTheDocument()
    expect(screen.getByText('Rodar gcc sem_main.o')).toBeInTheDocument()
  })

  it('lista feedback pedindo mudanças com link para a revisão', async () => {
    server.use(...signedIn())
    server.use(
      withSessions([]),
      withContinue({
        changesRequested: [{ reviewRequestId: 'r1', evidenceTitle: 'Etapas do pipeline', topicId: 'compilation-pipeline', updatedAt: '2026-10-17T10:00:00Z' }],
        reviewsToGive: 2,
      }),
    )
    renderApp('/')
    expect(await screen.findByRole('link', { name: 'Etapas do pipeline' })).toHaveAttribute('href', '/revisoes/r1')
    expect(screen.getByRole('link', { name: '2 revisões esperando por você' })).toHaveAttribute('href', '/time')
  })

  it('inicia uma sessão de estudo no modo escolhido', async () => {
    let body: unknown
    server.use(
      ...signedIn(),
      withSessions([]),
      http.post('/api/me/study-sessions', async ({ request }) => {
        body = await request.json()
        server.use(withSessions([{ id: 's9', mode: 'rescue', topicId: 'terminal-shell', startedAt: '2026-10-18T10:00:00Z' }]))
        return HttpResponse.json({ id: 's9' }, { status: 201 })
      }),
    )
    const { user } = renderApp('/')
    await user.selectOptions(await screen.findByLabelText('Modo da sessão'), 'rescue')
    expect(screen.getByText(/não conclui marcos/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Começar sessão' }))
    expect(body).toEqual({ mode: 'rescue', topicId: 'terminal-shell' })
    expect(await screen.findByRole('heading', { name: 'Sessão em andamento' })).toBeInTheDocument()
  })

  it('encerra a sessão com resumo, nota de retomada e próxima ação', async () => {
    let body: unknown
    server.use(
      ...signedIn(),
      withSessions([{ id: 's9', mode: 'survival', topicId: 'terminal-shell', startedAt: '2026-10-18T10:00:00Z' }]),
      http.patch('/api/me/study-sessions/s9', async ({ request }) => {
        body = await request.json()
        server.use(withSessions([]))
        return HttpResponse.json({ id: 's9' })
      }),
    )
    const { user } = renderApp('/')
    await user.type(await screen.findByLabelText('O que fiz'), 'Testei expansões')
    await user.type(screen.getByLabelText('Nota de retomada'), 'Entender aspas simples')
    await user.type(screen.getByLabelText('Próxima ação ao voltar'), 'Refazer com aspas duplas')
    await user.click(screen.getByRole('button', { name: 'Encerrar sessão' }))
    expect(body).toEqual({
      summary: 'Testei expansões',
      restartNote: 'Entender aspas simples',
      nextAction: 'Refazer com aspas duplas',
      end: true,
    })
    expect(await screen.findByRole('button', { name: 'Começar sessão' })).toBeInTheDocument()
  })
})

describe('painel de progresso da home', () => {
  it('mostra o progresso por etapa do núcleo com tópicos demonstrados sobre o total', async () => {
    server.use(...signedIn())
    server.use(
      withSessions([]),
      http.get('/api/me/progress', () =>
        HttpResponse.json({
          'terminal-shell': {
            topicId: 'terminal-shell', status: 'demonstrated', resourcesOpened: 1, resourcesFinished: 1, attempts: 1,
            submittedAttempts: 1, evidence: 1, sharedEvidence: 1, acceptedReviews: 1,
          },
        }),
      ),
    )
    renderApp('/')
    const panel = await screen.findByRole('region', { name: 'Progresso por etapa' })
    const tools = within(panel).getByRole('progressbar', { name: /Ferramentas e execução/ })
    await waitFor(() => expect(tools).toHaveAttribute('aria-valuenow', '1'))
    expect(tools).toHaveAttribute('aria-valuemax', '1')
    expect(within(panel).getByRole('progressbar', { name: /C e compilação/ })).toHaveAttribute('aria-valuenow', '0')
    expect(within(panel).queryByText(/Ramo: fundamentos de frontend/)).not.toBeInTheDocument()
  })
})

describe('home para quem está começando', () => {
  it('troca os contadores zerados por um convite para o primeiro tópico', async () => {
    server.use(...signedIn())
    server.use(withSessions([]))
    renderApp('/')
    const start = await screen.findByRole('region', { name: 'Seu progresso' })
    expect(within(start).getByText('Você ainda não começou nenhum tópico')).toBeInTheDocument()
    expect(within(start).getByRole('link', { name: 'Ver a trilha completa' })).toHaveAttribute('href', '/roadmap')
    expect(within(start).queryByText('em exploração ou prática')).not.toBeInTheDocument()
  })
})
