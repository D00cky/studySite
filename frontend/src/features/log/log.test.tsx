import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Note } from '../../api/types'
import { resource } from '../../test/fixtures'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const note: Note = {
  id: 'n1', userId: 'u-lia', authorName: 'Lia', topicId: 'compilation-pipeline', title: 'Dúvida sobre realloc',
  body: 'Por que o ponteiro muda?', visibility: 'private', createdAt: '', updatedAt: '2026-10-18T10:00:00Z',
}

function setup() {
  server.use(...signedIn())
  server.use(
    http.get('/api/me/study-sessions', () =>
      HttpResponse.json([{ id: 's1', mode: 'survival', topicId: 'terminal-shell', startedAt: '2026-10-17T10:00:00Z', endedAt: '2026-10-17T10:25:00Z', summary: 'Testei expansões', restartNote: 'Entender aspas' }]),
    ),
    http.get('/api/me/attempts', () =>
      HttpResponse.json([{ id: 'a1', topicId: 'compilation-pipeline', exerciseId: 'ex-pipeline-stages', prediction: '-c gera .o', status: 'submitted', startedAt: '', updatedAt: '2026-10-17T11:00:00Z' }]),
    ),
    http.get('/api/me/evidence', () =>
      HttpResponse.json([{ id: 'e1', userId: 'u-lia', authorName: 'Lia', topicId: 'compilation-pipeline', kind: 'text', title: 'Etapas do pipeline', body: '', visibility: 'group', createdAt: '', updatedAt: '2026-10-17T12:00:00Z' }]),
    ),
    http.get('/api/me/self-assessments', () =>
      HttpResponse.json([{ id: 'sa1', topicId: 'compilation-pipeline', level: 2, createdAt: '2026-10-17T12:00:00Z' }]),
    ),
    http.get('/api/me/resource-events', () =>
      HttpResponse.json([{ id: 're1', resourceId: 'gcc-overall-options', topicId: 'compilation-pipeline', kind: 'opened', createdAt: '2026-10-17T09:00:00Z' }]),
    ),
    http.get('/api/me/notes', () => HttpResponse.json([note])),
    http.get('/api/curriculum/resources', () => HttpResponse.json([resource])),
  )
}

describe('meu registro', () => {
  it('mantém cada tipo de registro em sua própria seção', async () => {
    setup()
    renderApp('/registro')
    expect(await screen.findByRole('heading', { level: 1, name: 'Meu registro' })).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Sessões de estudo' })).findByText('Entender aspas')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Tentativas de exercício' })).findByText(/-c gera .o/)).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Evidências' })).findByText('Etapas do pipeline')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Autoavaliações' })).findByText(/Explico/)).toBeInTheDocument()
    const consumption = screen.getByRole('region', { name: 'Recursos consultados' })
    expect(await within(consumption).findByText('Overall Options (Using the GNU Compiler Collection)')).toBeInTheDocument()
    expect(within(consumption).queryByText('gcc-overall-options')).not.toBeInTheDocument()
    expect(within(consumption).getByText(/não demonstra domínio/i)).toBeInTheDocument()
  })

  it('cria nota privada e depois a compartilha com o grupo', async () => {
    let created: unknown
    let updated: unknown
    setup()
    server.use(
      http.post('/api/notes', async ({ request }) => {
        created = await request.json()
        return HttpResponse.json(note, { status: 201 })
      }),
      http.patch('/api/notes/n1', async ({ request }) => {
        updated = await request.json()
        return HttpResponse.json({ ...note, visibility: 'group', groupId: 'g1' })
      }),
    )
    const { user } = renderApp('/registro')
    const notes = await screen.findByRole('region', { name: 'Notas' })
    await user.type(within(notes).getByLabelText('Título da nota'), 'Resumo de ponteiros')
    await user.type(within(notes).getByLabelText('Texto'), 'p + 1 avança sizeof(*p)')
    await user.click(within(notes).getByRole('button', { name: 'Salvar nota' }))
    expect(created).toEqual({ title: 'Resumo de ponteiros', body: 'p + 1 avança sizeof(*p)', visibility: 'private' })
    const item = (await within(notes).findByText('Dúvida sobre realloc')).closest('li')!
    expect(within(item).getByText('Privada')).toBeInTheDocument()
    await user.click(within(item).getByRole('button', { name: 'Compartilhar com Fundamentos' }))
    expect(updated).toEqual({ visibility: 'group', groupId: 'g1' })
  })

  it('ajusta o ritmo semanal sem penalidades', async () => {
    let body: unknown
    setup()
    server.use(
      http.patch('/api/auth/me', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({})
      }),
    )
    const { user } = renderApp('/registro')
    await user.selectOptions(await screen.findByLabelText('Ritmo semanal'), 'survival')
    await user.click(screen.getByRole('button', { name: 'Salvar ritmo' }))
    expect(body).toEqual({ weeklyMode: 'survival' })
  })
})
