import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { GroupDetail, HelpSignal, MyReviews, ReviewRequest } from '../../api/types'
import { emptyWorkspace, group } from '../../test/fixtures'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const review: ReviewRequest = {
  id: 'r1', groupId: 'g1', evidenceId: 'e1', evidenceTitle: 'Etapas do pipeline', topicId: 'compilation-pipeline',
  requesterId: 'u-gabriel', requesterName: 'Gabriel', question: '', status: 'open', createdAt: '', updatedAt: '',
}

const blocker: HelpSignal = {
  id: 'h1', groupId: 'g1', userId: 'u-lia', displayName: 'Lia', topicId: 'compilation-pipeline', kind: 'blocker',
  body: 'Segfault no swap', createdAt: '2026-10-18T10:00:00Z',
}

function setupGroup(detail: GroupDetail = group, meOverrides = {}) {
  server.use(...signedIn(meOverrides))
  server.use(
    http.get('/api/groups/g1', () => HttpResponse.json(detail)),
    http.get('/api/me/review-requests', () => HttpResponse.json({ requested: [], toReview: [review] } satisfies MyReviews)),
    http.get('/api/groups/g1/review-requests', () => HttpResponse.json([review])),
    http.get('/api/groups/g1/signals', () => HttpResponse.json([blocker])),
    http.get('/api/groups/g1/team-sessions', () =>
      HttpResponse.json([{ id: 'ts1', groupId: 'g1', title: 'Revisão do pipeline', agenda: '', findings: '', nextSteps: '', createdBy: 'u-lia', createdAt: '2026-10-18T10:00:00Z', updatedAt: '' }]),
    ),
    http.get('/api/groups/g1/projects', () => HttpResponse.json([])),
    http.get('/api/curriculum/projects', () =>
      HttpResponse.json([{ id: 'c-task-cli', title: 'CLI de tarefas em C', status: 'authored', cumulative: false, question: '', topics: [] }]),
    ),
    http.get('/api/groups/g1/progress', () =>
      HttpResponse.json([
        { userId: 'u-gabriel', displayName: 'Gabriel', role: 'mentor', topics: {} },
        { userId: 'u-lia', displayName: 'Lia', role: 'learner', topics: { 'compilation-pipeline': { ...emptyWorkspace.progress, status: 'demonstrated', acceptedReviews: 1 } } },
      ]),
    ),
    http.get('/api/groups/g1/resource-suggestions', () =>
      HttpResponse.json([{ id: 's1', groupId: 'g1', suggestedBy: 'u-lia', suggestedByName: 'Lia', title: 'Um artigo', url: 'https://example.test/a', topicIds: [], rationale: 'Bom resumo', status: 'pending', createdAt: '' }]),
    ),
  )
}

describe('time — sem grupo', () => {
  it('cria grupo ou entra com código', async () => {
    let created: unknown
    let joined: unknown
    server.use(...signedIn({ groups: [] }))
    server.use(
      http.post('/api/groups', async ({ request }) => {
        created = await request.json()
        return HttpResponse.json(group, { status: 201 })
      }),
      http.post('/api/groups/join', async ({ request }) => {
        joined = await request.json()
        return HttpResponse.json(group)
      }),
    )
    const { user } = renderApp('/time')
    await user.type(await screen.findByLabelText('Código de convite'), 'ABCDEF2345')
    await user.click(screen.getByRole('button', { name: 'Entrar no grupo' }))
    expect(joined).toEqual({ inviteCode: 'ABCDEF2345' })
    await user.type(screen.getByLabelText('Nome do grupo'), 'Fundamentos')
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }))
    expect(created).toEqual({ name: 'Fundamentos' })
  })
})

describe('time — com grupo', () => {
  it('mostra membros, sinais úteis e nenhum ranking', async () => {
    setupGroup()
    renderApp('/time')
    expect(await screen.findByRole('heading', { level: 1, name: /Fundamentos/ })).toBeInTheDocument()
    const members = screen.getByRole('region', { name: 'Membros' })
    expect(within(members).getByText('Gabriel')).toBeInTheDocument()
    expect(within(members).getByText('Mentor(a)')).toBeInTheDocument()
    const signals = screen.getByRole('region', { name: 'Sinais do time' })
    expect(signals).toHaveTextContent('1 revisão aberta')
    expect(signals).toHaveTextContent('1 bloqueio')
    expect(screen.queryByText(/ranking|pontos|placar/i)).not.toBeInTheDocument()
  })

  it('lista revisões esperando por você com link', async () => {
    setupGroup()
    renderApp('/time')
    const queue = await screen.findByRole('region', { name: 'Revisões esperando por você' })
    expect(await within(queue).findByRole('link', { name: 'Etapas do pipeline' })).toHaveAttribute('href', '/revisoes/r1')
  })

  it('código de convite só aparece para mentores', async () => {
    setupGroup()
    renderApp('/time')
    await screen.findByRole('region', { name: 'Membros' })
    expect(screen.queryByText(/Código de convite:/)).not.toBeInTheDocument()
  })

  it('mentor vê o código de convite e revisa sugestões', async () => {
    let reviewBody: unknown
    setupGroup({ ...group, myRole: 'mentor', inviteCode: 'ABCDEF2345' }, { id: 'u-gabriel', groups: [{ id: 'g1', name: 'Fundamentos', role: 'mentor' }] })
    server.use(
      http.post('/api/resource-suggestions/s1/review', async ({ request }) => {
        reviewBody = await request.json()
        return HttpResponse.json({})
      }),
    )
    const { user } = renderApp('/time')
    expect(await screen.findByText('ABCDEF2345')).toBeInTheDocument()
    const suggestions = await screen.findByRole('region', { name: 'Sugestões de recursos' })
    await user.click(within(suggestions).getByRole('button', { name: 'Aceitar' }))
    expect(reviewBody).toEqual({ status: 'accepted' })
  })

  it('abre sinal de bloqueio e resolve o próprio sinal', async () => {
    let added: unknown
    let resolved = false
    setupGroup()
    server.use(
      http.post('/api/groups/g1/signals', async ({ request }) => {
        added = await request.json()
        return HttpResponse.json(blocker, { status: 201 })
      }),
      http.post('/api/signals/h1/resolve', () => {
        resolved = true
        return HttpResponse.json(blocker)
      }),
    )
    const { user } = renderApp('/time')
    const region = await screen.findByRole('region', { name: 'Bloqueios e pedidos de ajuda' })
    expect(await within(region).findByText('Segfault no swap')).toBeInTheDocument()
    await user.click(within(region).getByRole('button', { name: 'Marcar como resolvido' }))
    expect(resolved).toBe(true)
    await user.selectOptions(within(region).getByLabelText('Tipo de sinal'), 'want_help')
    await user.type(within(region).getByLabelText('Descreva'), 'Quero ajuda com realloc')
    await user.click(within(region).getByRole('button', { name: 'Enviar sinal' }))
    expect(added).toEqual({ kind: 'want_help', body: 'Quero ajuda com realloc' })
  })

  it('mostra progresso compartilhado por pessoa', async () => {
    setupGroup()
    renderApp('/time')
    const region = await screen.findByRole('region', { name: 'Progresso compartilhado' })
    const lia = await within(region).findByRole('heading', { name: 'Lia' })
    expect(lia.closest('li')).toHaveTextContent('O pipeline de compilação')
    expect(lia.closest('li')).toHaveTextContent('Demonstrado')
  })

  it('cria sessão do time e vai para ela', async () => {
    let created: unknown
    setupGroup()
    server.use(
      http.post('/api/groups/g1/team-sessions', async ({ request }) => {
        created = await request.json()
        return HttpResponse.json({ session: { id: 'ts2' }, roles: [] }, { status: 201 })
      }),
      http.get('/api/team-sessions/ts2', () =>
        HttpResponse.json({ session: { id: 'ts2', groupId: 'g1', title: 'Casos-limite', agenda: '', findings: '', nextSteps: '', createdBy: 'u-lia', createdAt: '', updatedAt: '' }, roles: [] }),
      ),
      http.get('/api/groups/g1/team-sessions/suggested-roles', () => HttpResponse.json([])),
    )
    const { user, router } = renderApp('/time')
    const region = await screen.findByRole('region', { name: 'Sessões do time' })
    expect(await within(region).findByRole('link', { name: 'Revisão do pipeline' })).toHaveAttribute('href', '/sessoes/ts1')
    await user.type(within(region).getByLabelText('Título da sessão'), 'Casos-limite')
    await user.click(within(region).getByRole('button', { name: 'Criar sessão' }))
    expect(created).toEqual({ title: 'Casos-limite' })
    await screen.findByRole('heading', { level: 1, name: 'Casos-limite' })
    expect(router.state.location.pathname).toBe('/sessoes/ts2')
  })
})
