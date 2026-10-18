import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { me } from '../../test/fixtures'
import { signedIn, signedOut } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

describe('autenticação', () => {
  it('redireciona para o login quem não entrou', async () => {
    server.use(...signedOut())
    const { router } = renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/entrar')
  })

  it('entra com e-mail e senha e chega ao painel', async () => {
    server.use(...signedOut())
    let body: unknown
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        body = await request.json()
        server.use(...signedIn())
        return HttpResponse.json(me)
      }),
    )
    const { user } = renderApp('/entrar')
    await user.type(await screen.findByLabelText('E-mail'), 'lia@example.test')
    await user.type(screen.getByLabelText('Senha'), 'senha-segura-123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('heading', { name: 'Continue de onde parou' })).toBeInTheDocument()
    expect(body).toEqual({ email: 'lia@example.test', password: 'senha-segura-123' })
  })

  it('mostra a mensagem do servidor quando a senha está errada', async () => {
    server.use(
      ...signedOut(),
      http.post('/api/auth/login', () =>
        HttpResponse.json({ status: 401, detail: 'E-mail ou senha incorretos.' }, { status: 401 }),
      ),
    )
    const { user } = renderApp('/entrar')
    await user.type(await screen.findByLabelText('E-mail'), 'lia@example.test')
    await user.type(screen.getByLabelText('Senha'), 'errada-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
  })

  it('cria conta e entra direto', async () => {
    server.use(
      ...signedOut(),
      http.post('/api/auth/register', () => {
        server.use(...signedIn())
        return HttpResponse.json(me, { status: 201 })
      }),
    )
    const { user } = renderApp('/cadastro')
    await user.type(await screen.findByLabelText('Nome'), 'Lia')
    await user.type(screen.getByLabelText('E-mail'), 'lia@example.test')
    await user.type(screen.getByLabelText(/^Senha/), 'senha-segura-123')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByRole('heading', { name: 'Continue de onde parou' })).toBeInTheDocument()
  })

  it('sai da conta e volta ao login', async () => {
    server.use(
      ...signedIn(),
      http.post('/api/auth/logout', () => {
        server.use(...signedOut())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderApp('/')
    await user.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })
})

describe('estrutura do app', () => {
  it('tem link para pular ao conteúdo e navegação principal', async () => {
    server.use(...signedIn())
    renderApp('/')
    expect(await screen.findByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute('href', '#conteudo')
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    for (const name of ['Início', 'Roadmap', 'Recursos', 'Projetos', 'Time', 'Meu registro', 'Como estudamos']) {
      expect(nav).toContainElement(screen.getByRole('link', { name }))
    }
  })

  it('mostra página de não encontrado para rotas desconhecidas', async () => {
    server.use(...signedIn())
    renderApp('/nao-existe')
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  })
})
