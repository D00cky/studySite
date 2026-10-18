import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { TeamSessionDetail } from '../../api/types'
import { group } from '../../test/fixtures'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const detail: TeamSessionDetail = {
  session: {
    id: 'ts1', groupId: 'g1', title: 'Revisão do pipeline', topicId: 'compilation-pipeline', agenda: '1. Demo 2. Casos-limite',
    findings: '', nextSteps: '', createdBy: 'u-gabriel', createdAt: '2026-10-18T10:00:00Z', updatedAt: '',
  },
  roles: [
    { userId: 'u-gabriel', displayName: 'Gabriel', role: 'author', contribution: 'Expliquei o Makefile.' },
    { userId: 'u-lia', displayName: 'Lia', role: 'challenger', contribution: '' },
  ],
}

function setup(d: TeamSessionDetail = detail) {
  server.use(...signedIn())
  server.use(
    http.get('/api/team-sessions/ts1', () => HttpResponse.json(d)),
    http.get('/api/groups/g1', () => HttpResponse.json(group)),
    http.get('/api/groups/g1/team-sessions/suggested-roles', () =>
      HttpResponse.json([
        { userId: 'u-lia', role: 'author' },
        { userId: 'u-gabriel', role: 'challenger' },
        { userId: 'u-lia', role: 'reviewer' },
        { userId: 'u-gabriel', role: 'synthesizer' },
      ]),
    ),
  )
}

describe('sessão do time', () => {
  it('mostra pauta e papéis com a contribuição de cada pessoa', async () => {
    setup()
    renderApp('/sessoes/ts1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Revisão do pipeline' })).toBeInTheDocument()
    expect(screen.getByText('1. Demo 2. Casos-limite')).toBeInTheDocument()
    const roles = screen.getByRole('region', { name: 'Papéis' })
    expect(within(roles).getByText('Autor(a)')).toBeInTheDocument()
    expect(within(roles).getByText('Expliquei o Makefile.')).toBeInTheDocument()
  })

  it('cada pessoa registra a própria contribuição no papel que assumiu', async () => {
    let body: unknown
    setup()
    server.use(
      http.patch('/api/team-sessions/ts1/roles/challenger/contribution', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(detail)
      }),
    )
    const { user } = renderApp('/sessoes/ts1')
    const field = await screen.findByLabelText('Sua contribuição como Desafiante')
    await user.type(field, 'Propus arquivo sem permissão.')
    await user.click(screen.getByRole('button', { name: 'Salvar contribuição' }))
    expect(body).toEqual({ contribution: 'Propus arquivo sem permissão.' })
    expect(screen.queryByLabelText('Sua contribuição como Autor(a)')).not.toBeInTheDocument()
  })

  it('aplica a rotação sugerida de papéis', async () => {
    let body: unknown
    setup({ ...detail, session: { ...detail.session, createdBy: 'u-lia' }, roles: [] })
    server.use(
      http.put('/api/team-sessions/ts1/roles', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(detail)
      }),
    )
    const { user } = renderApp('/sessoes/ts1')
    await user.click(await screen.findByRole('button', { name: 'Usar rotação sugerida' }))
    expect(body).toEqual([
      { userId: 'u-lia', role: 'author' },
      { userId: 'u-gabriel', role: 'challenger' },
      { userId: 'u-lia', role: 'reviewer' },
      { userId: 'u-gabriel', role: 'synthesizer' },
    ])
  })

  it('distribui papéis manualmente', async () => {
    let body: unknown
    setup({ ...detail, session: { ...detail.session, createdBy: 'u-lia' }, roles: [] })
    server.use(
      http.put('/api/team-sessions/ts1/roles', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(detail)
      }),
    )
    const { user } = renderApp('/sessoes/ts1')
    const form = await screen.findByRole('form', { name: 'Distribuir papéis' })
    await user.selectOptions(within(form).getByLabelText('Autor(a)'), 'u-gabriel')
    await user.selectOptions(within(form).getByLabelText('Desafiante'), 'u-lia')
    await user.selectOptions(within(form).getByLabelText('Sintetizador(a)'), 'u-lia')
    await user.click(within(form).getByRole('button', { name: 'Salvar papéis' }))
    expect(body).toEqual([
      { userId: 'u-gabriel', role: 'author' },
      { userId: 'u-lia', role: 'challenger' },
      { userId: 'u-lia', role: 'synthesizer' },
    ])
  })

  it('registra achados e próximos passos', async () => {
    let body: unknown
    setup()
    server.use(
      http.patch('/api/team-sessions/ts1', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(detail)
      }),
    )
    const { user } = renderApp('/sessoes/ts1')
    await user.type(await screen.findByLabelText('Achados'), 'Exit code 2 não documentado.')
    await user.type(screen.getByLabelText('Próximos passos'), 'Documentar no README.')
    await user.click(screen.getByRole('button', { name: 'Salvar registro da sessão' }))
    expect(body).toEqual({ agenda: '1. Demo 2. Casos-limite', findings: 'Exit code 2 não documentado.', nextSteps: 'Documentar no README.' })
  })
})
