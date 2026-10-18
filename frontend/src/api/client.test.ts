import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { api, ApiError } from './client'

describe('api client', () => {
  it('faz GET com cookies da mesma origem e devolve JSON', async () => {
    server.use(http.get('/api/curriculum/policies', () => HttpResponse.json({ ok: true })))
    await expect(api.get('/api/curriculum/policies')).resolves.toEqual({ ok: true })
  })

  it('envia o token do cookie XSRF-TOKEN no cabeçalho X-XSRF-TOKEN', async () => {
    document.cookie = 'XSRF-TOKEN=token-do-cookie; path=/'
    let header: string | null = null
    server.use(
      http.post('/api/notes', ({ request }) => {
        header = request.headers.get('X-XSRF-TOKEN')
        return HttpResponse.json({ id: '1' }, { status: 201 })
      }),
    )
    await api.post('/api/notes', { title: 'x' })
    expect(header).toBe('token-do-cookie')
  })

  it('busca o token CSRF antes do primeiro POST quando o cookie não existe', async () => {
    let header: string | null = null
    server.use(
      http.get('/api/auth/csrf', () => {
        document.cookie = 'XSRF-TOKEN=token-novo; path=/'
        return HttpResponse.json({ headerName: 'X-XSRF-TOKEN', token: 'mascarado' })
      }),
      http.post('/api/auth/login', ({ request }) => {
        header = request.headers.get('X-XSRF-TOKEN')
        return HttpResponse.json({ id: 'u1' })
      }),
    )
    await api.post('/api/auth/login', { email: 'a@b.c', password: 'x' })
    expect(header).toBe('token-novo')
  })

  it('converte Problem Details em ApiError com status e mensagem', async () => {
    server.use(
      http.get('/api/groups/x', () =>
        HttpResponse.json({ status: 404, title: 'Not Found', detail: 'Grupo não encontrado.' }, { status: 404 }),
      ),
    )
    const error = (await api.get('/api/groups/x').catch((e: unknown) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(404)
    expect(error.message).toBe('Grupo não encontrado.')
  })

  it('usa uma mensagem genérica quando a resposta de erro não tem corpo', async () => {
    server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })))
    const error = (await api.get('/api/auth/me').catch((e: unknown) => e)) as ApiError
    expect(error.status).toBe(401)
    expect(error.message).toMatch(/sessão/i)
  })

  it('aceita respostas 204 sem corpo', async () => {
    document.cookie = 'XSRF-TOKEN=t; path=/'
    server.use(http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })))
    await expect(api.post('/api/auth/logout')).resolves.toBeUndefined()
  })
})
