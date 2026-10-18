import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FocusBlock } from '../../api/types'
import { emptyWorkspace, topicPage } from '../../test/fixtures'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const NOW = new Date('2026-10-18T15:00:00Z')
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString()

function block(over: Partial<FocusBlock> = {}): FocusBlock {
  return { id: 'f1', kind: 'focus', plannedMinutes: 25, startedAt: minutesAgo(10), ...over }
}

function base(current: FocusBlock | null = null) {
  server.use(...signedIn())
  server.use(
    http.get('/api/me/study-sessions', () => HttpResponse.json([])),
    http.get('/api/me/focus-blocks/current', () =>
      current ? HttpResponse.json(current) : new HttpResponse(null, { status: 204 }),
    ),
  )
}

describe('pomodoro que acompanha a sessão', () => {
  beforeEach(() => {
    // Só o relógio é falso: timers reais mantêm MSW e user-event funcionando.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('começa um bloco com a duração escolhida, ligado ao tópico aberto', async () => {
    let body: unknown
    base()
    server.use(
      http.get('/api/curriculum/topics/compilation-pipeline', () => HttpResponse.json(topicPage)),
      http.get('/api/me/topics/compilation-pipeline', () => HttpResponse.json(emptyWorkspace)),
      http.post('/api/me/focus-blocks', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(block({ plannedMinutes: 40, startedAt: NOW.toISOString(), topicId: 'compilation-pipeline' }), { status: 201 })
      }),
    )
    const { user } = renderApp('/topicos/compilation-pipeline')
    const dock = await screen.findByRole('region', { name: 'Pomodoro' })
    await user.click(within(dock).getByRole('button', { name: 'Iniciar foco' }))
    await user.click(within(dock).getByRole('radio', { name: '40 min' }))
    await user.click(within(dock).getByRole('button', { name: 'Começar' }))
    expect(body).toEqual({ kind: 'focus', plannedMinutes: 40, topicId: 'compilation-pipeline' })
  })

  it('mostra o tempo restante do bloco em andamento, também no título da aba', async () => {
    base(block({ topicId: 'compilation-pipeline' }))
    renderApp('/')
    const dock = await screen.findByRole('region', { name: 'Pomodoro' })
    expect(await within(dock).findByText('15:00')).toBeInTheDocument()
    expect(within(dock).getByText('Foco')).toBeInTheDocument()
    await waitFor(() => expect(document.title).toContain('15:00'))
  })

  it('estende em 5 minutos e encerra antes da hora sem perder o tempo feito', async () => {
    const patches: unknown[] = []
    let open: FocusBlock | null = block()
    base()
    server.use(
      http.get('/api/me/focus-blocks/current', () => (open ? HttpResponse.json(open) : new HttpResponse(null, { status: 204 }))),
      http.patch('/api/me/focus-blocks/f1', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        patches.push(body)
        open = body.end ? null : block({ plannedMinutes: 30 })
        return HttpResponse.json(body.end ? block({ endedAt: NOW.toISOString() }) : open)
      }),
    )
    const { user } = renderApp('/')
    const dock = await screen.findByRole('region', { name: 'Pomodoro' })
    await user.click(await within(dock).findByRole('button', { name: '+5 min' }))
    await user.click(within(dock).getByRole('button', { name: 'Encerrar bloco' }))
    expect(patches).toEqual([{ plannedMinutes: 30 }, { end: true }])
    expect(await within(dock).findByText('Bloco encerrado: 10 min de foco contam no seu progresso.')).toBeInTheDocument()
  })

  it('ao acabar o tempo, encerra sozinho e oferece uma pausa', async () => {
    let ended = false
    base(block({ startedAt: minutesAgo(26) }))
    server.use(
      http.patch('/api/me/focus-blocks/f1', () => {
        ended = true
        return HttpResponse.json(block({ startedAt: minutesAgo(26), endedAt: minutesAgo(1) }))
      }),
    )
    renderApp('/')
    const dock = await screen.findByRole('region', { name: 'Pomodoro' })
    expect(await within(dock).findByText('Bloco concluído: 25 min de foco.')).toBeInTheDocument()
    expect(ended).toBe(true)
    expect(within(dock).getByRole('button', { name: 'Pausa de 5 min' })).toBeInTheDocument()
  })
})
