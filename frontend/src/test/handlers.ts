import { http, HttpResponse } from 'msw'
import * as f from './fixtures'

/** Handlers de uma pessoa autenticada com dados básicos; testes sobrescrevem o que precisarem. */
export function signedIn(overrides: Partial<typeof f.me> = {}) {
  return [
    http.get('/api/auth/me', () => HttpResponse.json({ ...f.me, ...overrides })),
    http.get('/api/auth/csrf', () => {
      document.cookie = 'XSRF-TOKEN=t; path=/'
      return HttpResponse.json({ headerName: 'X-XSRF-TOKEN', token: 't' })
    }),
    http.get('/api/me/continue', () => HttpResponse.json(f.continueView)),
    http.get('/api/curriculum', () => HttpResponse.json(f.roadmap)),
    http.get('/api/curriculum/policies', () => HttpResponse.json(f.policies)),
    http.get('/api/me/progress', () => HttpResponse.json({})),
    http.get('/api/me/focus-blocks/current', () => new HttpResponse(null, { status: 204 })),
    http.get('/api/me/metrics', () => HttpResponse.json(f.emptyMetrics)),
  ]
}

export function signedOut() {
  return [
    http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
    http.get('/api/auth/csrf', () => {
      document.cookie = 'XSRF-TOKEN=t; path=/'
      return HttpResponse.json({ headerName: 'X-XSRF-TOKEN', token: 't' })
    }),
  ]
}
