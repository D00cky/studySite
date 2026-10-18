import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { pendingResource, resource } from '../../test/fixtures'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

let lastQuery = ''

function setup() {
  server.use(...signedIn())
  server.use(
    http.get('/api/curriculum/resources', ({ request }) => {
      const params = new URL(request.url).searchParams
      lastQuery = params.toString()
      const all = [resource, pendingResource]
      return HttpResponse.json(all.filter((r) => !params.get('language') || r.language === params.get('language')))
    }),
  )
}

describe('biblioteca de recursos', () => {
  it('lista recursos com verificação e tópicos associados', async () => {
    setup()
    renderApp('/recursos')
    const item = (await screen.findByText('Overall Options (Using the GNU Compiler Collection)')).closest('li')!
    expect(within(item).getByText(/Link verificado em/)).toBeInTheDocument()
    expect(within(item).getByRole('link', { name: 'O pipeline de compilação' })).toHaveAttribute('href', '/topicos/compilation-pipeline')
    const pending = screen.getByText('TeachYourselfCS-PT (tradução comunitária)').closest('li')!
    expect(within(pending).getByText('Aguardando verificação')).toBeInTheDocument()
  })

  it('filtra por idioma, formato, dificuldade e tópico na API', async () => {
    setup()
    const { user } = renderApp('/recursos')
    await screen.findByText('Overall Options (Using the GNU Compiler Collection)')
    await user.selectOptions(screen.getByLabelText('Idioma'), 'pt-BR')
    expect(await screen.findByText('TeachYourselfCS-PT (tradução comunitária)')).toBeInTheDocument()
    expect(screen.queryByText('Overall Options (Using the GNU Compiler Collection)')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Formato'), 'article')
    await user.selectOptions(screen.getByLabelText('Dificuldade'), 'intro')
    await user.selectOptions(screen.getByLabelText('Tópico'), 'terminal-shell')
    await screen.findByText('TeachYourselfCS-PT (tradução comunitária)')
    expect(new URLSearchParams(lastQuery).get('format')).toBe('article')
    expect(new URLSearchParams(lastQuery).get('difficulty')).toBe('intro')
    expect(new URLSearchParams(lastQuery).get('topic')).toBe('terminal-shell')
  })

  it('sugere um recurso para revisão do mentor', async () => {
    let body: unknown
    setup()
    server.use(
      http.post('/api/groups/g1/resource-suggestions', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 's1' }, { status: 201 })
      }),
    )
    const { user } = renderApp('/recursos')
    const form = await screen.findByRole('form', { name: 'Sugerir recurso' })
    await user.type(within(form).getByLabelText('Título'), 'Um artigo sobre linking')
    await user.type(within(form).getByLabelText('Link'), 'https://example.test/linking')
    await user.selectOptions(within(form).getByLabelText('Tópico relacionado'), 'compilation-pipeline')
    await user.type(within(form).getByLabelText('Por que usar'), 'Explica símbolos com exemplos')
    await user.click(within(form).getByRole('button', { name: 'Enviar sugestão' }))
    expect(body).toEqual({
      title: 'Um artigo sobre linking', url: 'https://example.test/linking',
      topicIds: ['compilation-pipeline'], rationale: 'Explica símbolos com exemplos',
    })
    expect(await within(form).findByText(/Sugestão enviada/)).toBeInTheDocument()
  })
})
