import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Evidence, Metrics } from '../../api/types'
import { continueView, emptyMetrics } from '../../test/fixtures'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const byHour = Array(24).fill(0)
byHour[9] = 300
byHour[21] = 100
const byWeekday = [50, 400, 60, 0, 0, 100, 0]

const metrics: Metrics = {
  totalMinutes: 610,
  focusBlocks: 22,
  medianBlockMinutes: 25,
  firstFocusAt: '2026-09-01T12:00:00Z',
  thisWeekMinutes: 95,
  weeks: ['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12'].map(
    (weekStart, i) => ({ weekStart, minutes: i === 7 ? 95 : i * 10, blocks: i }),
  ),
  byHour,
  byWeekday,
  topics: [{ topicId: 'compilation-pipeline', minutes: 200 }],
}

const repo: Evidence = {
  id: 'e1', userId: 'u-lia', authorName: 'Lia', topicId: 'compilation-pipeline', kind: 'repository',
  title: 'CLI de tarefas em C', body: '', url: 'https://example.test/tasks', visibility: 'private',
  createdAt: '2026-10-10T10:00:00Z', updatedAt: '2026-10-10T10:00:00Z',
}

function setup(m: Metrics = metrics, evidence: Evidence[] = [repo]) {
  server.use(...signedIn())
  server.use(
    http.get('/api/me/metrics', () => HttpResponse.json(m)),
    http.get('/api/me/evidence', () => HttpResponse.json(evidence)),
    http.get('/api/me/study-sessions', () => HttpResponse.json([])),
  )
}

describe('meu progresso', () => {
  it('mostra quanto você estudou, no total, nesta semana e semana a semana', async () => {
    setup()
    renderApp('/progresso')
    const time = await screen.findByRole('region', { name: 'Tempo estudado' })
    expect(within(time).getByText('10h10')).toBeInTheDocument()
    expect(within(time).getByText('1h35')).toBeInTheDocument()
    expect(within(time).getByText(/22 blocos/)).toBeInTheDocument()
    const weeks = within(time).getByRole('list', { name: 'Minutos por semana' })
    expect(within(weeks).getAllByRole('listitem')).toHaveLength(8)
    expect(within(weeks).getByText('semana de 12/10: 1h35')).toBeInTheDocument()
  })

  it('descreve o seu padrão sem falar em sequência de dias', async () => {
    setup()
    renderApp('/progresso')
    const pattern = await screen.findByRole('region', { name: 'Seu padrão' })
    expect(within(pattern).getByText('25 min')).toBeInTheDocument()
    expect(within(pattern).getByText('por volta das 9h')).toBeInTheDocument()
    expect(within(pattern).getByText('terça-feira')).toBeInTheDocument()
    expect(screen.queryByText(/sequência|dias seguidos|streak/i)).not.toBeInTheDocument()
  })

  it('mostra de onde você saiu, onde está e o próximo passo', async () => {
    setup()
    renderApp('/progresso')
    const journey = await screen.findByRole('region', { name: 'Do ponto A ao ponto B' })
    expect(within(journey).getByText(/Começou em/)).toBeInTheDocument()
    expect(within(journey).getByText(/Ferramentas e execução/)).toBeInTheDocument()
    const next = within(journey).getByRole('link', { name: /Terminal e shell/ })
    expect(next).toHaveAttribute('href', '/topicos/terminal-shell')
  })

  it('o próximo passo mostra código inline em vez de crases', async () => {
    setup()
    server.use(
      http.get('/api/me/continue', () =>
        HttpResponse.json({ ...continueView, nextAction: { kind: 'start_topic', text: 'Rode `echo $PATH` e conte.', topicId: 'terminal-shell' } }),
      ),
    )
    renderApp('/progresso')
    const journey = await screen.findByRole('region', { name: 'Do ponto A ao ponto B' })
    expect(await within(journey).findByText('echo $PATH', { selector: 'code' })).toBeInTheDocument()
    expect(within(journey).queryByText(/`/)).not.toBeInTheDocument()
  })

  it('lista o que você já construiu e o tempo por tópico', async () => {
    setup()
    renderApp('/progresso')
    const built = await screen.findByRole('region', { name: 'O que você já construiu' })
    expect(await within(built).findByRole('link', { name: 'CLI de tarefas em C' })).toHaveAttribute('href', 'https://example.test/tasks')
    const topics = screen.getByRole('region', { name: 'Tempo por tópico' })
    expect(within(topics).getByText('O pipeline de compilação')).toBeInTheDocument()
    expect(within(topics).getByText('3h20')).toBeInTheDocument()
  })

  it('sem blocos ainda, convida a usar o pomodoro', async () => {
    setup(emptyMetrics, [])
    renderApp('/progresso')
    const time = await screen.findByRole('region', { name: 'Tempo estudado' })
    expect(within(time).getByText('Nenhum bloco de foco ainda')).toBeInTheDocument()
    expect(within(time).getByText(/Iniciar foco/)).toBeInTheDocument()
  })
})

describe('progresso na página inicial', () => {
  it('mostra a jornada, o tempo estudado, o padrão e o que já construiu sem sair da home', async () => {
    setup()
    renderApp('/')
    const journey = await screen.findByRole('region', { name: 'Do ponto A ao ponto B' })
    expect(within(journey).getByRole('link', { name: /Terminal e shell/ })).toHaveAttribute('href', '/topicos/terminal-shell')

    const time = await screen.findByRole('region', { name: 'Tempo estudado' })
    expect(await within(time).findByText('1h35')).toBeInTheDocument()
    expect(within(within(time).getByRole('list', { name: 'Minutos por semana' })).getAllByRole('listitem')).toHaveLength(8)

    expect(await screen.findByRole('region', { name: 'Seu padrão' })).toBeInTheDocument()
    const built = screen.getByRole('region', { name: 'O que você já construiu' })
    expect(await within(built).findByRole('link', { name: 'CLI de tarefas em C' })).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Ver progresso detalhado' })).toHaveAttribute('href', '/progresso')
    expect(screen.getByRole('link', { name: 'Lia' })).toHaveAttribute('href', '/progresso')
  })

  it('sem blocos ainda, a home convida a usar o pomodoro', async () => {
    setup(emptyMetrics, [])
    renderApp('/')
    const time = await screen.findByRole('region', { name: 'Tempo estudado' })
    expect(await within(time).findByText('Nenhum bloco de foco ainda')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Seu padrão' })).not.toBeInTheDocument()
  })
})

describe('calendário de estudo (heatmap)', () => {
  const recent = {
    year: null, from: '2025-10-20', to: '2026-10-18', years: [2025, 2026],
    days: [{ date: '2026-10-12', minutes: 85 }, { date: '2026-10-14', minutes: 20 }],
  }

  it('pinta cada dia pelo tempo estudado e resume sem falar em sequência', async () => {
    setup()
    server.use(http.get('/api/me/focus-calendar', () => HttpResponse.json(recent)))
    renderApp('/')
    const section = await screen.findByRole('region', { name: 'Calendário de estudo' })
    expect(await within(section).findByRole('img', { name: /2 dias com estudo/ })).toBeInTheDocument()
    expect(within(section).getByTitle('1h25 em 12/10/2026')).toHaveAttribute('data-level', '3')
    expect(within(section).getByTitle('20 min em 14/10/2026')).toHaveAttribute('data-level', '1')
    expect(within(section).getByTitle('Sem estudo em 13/10/2026')).toHaveAttribute('data-level', '0')
    expect(within(section).queryByText(/seguid|sequência|streak/i)).not.toBeInTheDocument()
  })

  it('troca para um ano específico', async () => {
    const years: (string | null)[] = []
    setup()
    server.use(
      http.get('/api/me/focus-calendar', ({ request }) => {
        const year = new URL(request.url).searchParams.get('year')
        years.push(year)
        return HttpResponse.json(
          year === '2025'
            ? { year: 2025, from: '2025-01-01', to: '2025-12-31', years: [2025, 2026], days: [{ date: '2025-03-10', minutes: 120 }] }
            : recent,
        )
      }),
    )
    const { user } = renderApp('/progresso')
    const section = await screen.findByRole('region', { name: 'Calendário de estudo' })
    await user.click(await within(section).findByRole('button', { name: '2025' }))
    expect(within(section).getByRole('button', { name: '2025' })).toHaveAttribute('aria-pressed', 'true')
    expect(await within(section).findByTitle('2h em 10/03/2025')).toHaveAttribute('data-level', '4')
    expect(years).toContain('2025')
  })
})
