import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { signedIn } from '../test/handlers'
import { renderApp } from '../test/render'
import { server } from '../test/server'

describe('shell do app', () => {
  it('abre e fecha o menu compacto, e fecha ao navegar', async () => {
    server.use(...signedIn(), http.get('/api/me/study-sessions', () => HttpResponse.json([])))
    const { user, router } = renderApp('/')
    const toggle = await screen.findByRole('button', { name: 'Menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'menu-principal')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    await user.click(within(nav).getByRole('link', { name: 'Recursos' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/recursos'))
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('mostra uma barra de status com a rota atual', async () => {
    server.use(...signedIn(), http.get('/api/me/study-sessions', () => HttpResponse.json([])))
    renderApp('/roadmap')
    const status = await screen.findByRole('contentinfo')
    expect(within(status).getByText('~/roadmap')).toBeInTheDocument()
  })

  it('404 explica o erro e oferece caminhos de volta', async () => {
    server.use(...signedIn())
    renderApp('/nao-existe')
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByText(/nao-existe: No such file or directory/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Abrir o roadmap' })).toHaveAttribute('href', '/roadmap')
  })
})
