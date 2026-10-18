import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { resource } from '../test/fixtures'
import { signedIn } from '../test/handlers'
import { renderApp } from '../test/render'
import { server } from '../test/server'

const projects = [
  { id: 'build-a-compiler', title: 'Construa um compilador', status: 'authored', cumulative: false, track: 'build', question: '?', topics: [], milestoneCount: 1, minutes: 25 },
]

function palette() {
  server.use(...signedIn())
  server.use(
    http.get('/api/me/study-sessions', () => HttpResponse.json([])),
    http.get('/api/curriculum/projects', () => HttpResponse.json(projects)),
    http.get('/api/curriculum/resources', ({ request }) => {
      const q = new URL(request.url).searchParams.get('q') ?? ''
      return HttpResponse.json(q === 'comp' ? [{ ...resource, title: 'Guia de comp' }] : [])
    }),
  )
}

describe('paleta de comandos', () => {
  it('abre com Ctrl+K, busca tópicos e abre o escolhido com Enter', async () => {
    palette()
    const { user, router } = renderApp('/')
    await screen.findByRole('heading', { name: 'Continue de onde parou' })

    await user.keyboard('{Control>}k{/Control}')
    const dialog = screen.getByRole('dialog', { name: 'Buscar no site' })
    const input = within(dialog).getByRole('combobox', { name: 'Buscar tópicos, projetos e recursos' })
    expect(input).toHaveFocus()

    await user.type(input, 'termi')
    const option = within(dialog).getByRole('option', { name: /Terminal e shell/ })
    expect(option).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', option.id)

    await user.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/topicos/terminal-shell'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mostra projetos e recursos e navega com as setas', async () => {
    palette()
    const { user } = renderApp('/')
    await user.click(await screen.findByRole('button', { name: /Buscar/ }))
    const dialog = screen.getByRole('dialog', { name: 'Buscar no site' })
    await user.type(within(dialog).getByRole('combobox'), 'comp')

    expect(await within(dialog).findByRole('option', { name: /Construa um compilador/ })).toBeInTheDocument()
    expect(await within(dialog).findByRole('option', { name: /Guia de comp/ })).toBeInTheDocument()

    const first = within(dialog).getAllByRole('option')[0]
    expect(first).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}')
    expect(first).toHaveAttribute('aria-selected', 'false')
    expect(within(dialog).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('fecha com Esc e devolve o foco ao botão de busca', async () => {
    palette()
    const { user } = renderApp('/')
    const trigger = await screen.findByRole('button', { name: /Buscar/ })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('avisa quando nada foi encontrado', async () => {
    palette()
    const { user } = renderApp('/')
    await user.click(await screen.findByRole('button', { name: /Buscar/ }))
    await user.type(within(screen.getByRole('dialog')).getByRole('combobox'), 'zzzz')
    expect(await screen.findByText('Nada encontrado para “zzzz”.')).toBeInTheDocument()
  })
})
