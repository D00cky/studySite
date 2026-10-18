/**
 * Cliente HTTP da SPA. Usa cookies da mesma origem (sessão Spring) e envia o token
 * CSRF do cookie XSRF-TOKEN no cabeçalho X-XSRF-TOKEN em requisições que alteram dados.
 */

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const CSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_HEADER = 'X-XSRF-TOKEN'

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

/** O backend só emite o cookie quando o token é pedido; buscamos antes do primeiro POST. */
async function csrfToken(): Promise<string | null> {
  const existing = readCookie(CSRF_COOKIE)
  if (existing) return existing
  const res = await fetch(url('/api/auth/csrf'), { credentials: 'same-origin' })
  if (!res.ok) return null
  const body = (await res.json()) as { token?: string }
  return readCookie(CSRF_COOKIE) ?? body.token ?? null
}

function url(path: string): string {
  return new URL(path, window.location.origin).toString()
}

const FALLBACK_MESSAGES: Record<number, string> = {
  401: 'Sua sessão expirou ou você não entrou. Faça login novamente.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontrado.',
  429: 'Muitas tentativas. Aguarde alguns minutos.',
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    const token = await csrfToken()
    if (token) headers[CSRF_HEADER] = token
  }

  const res = await fetch(url(path), {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : undefined
  if (!res.ok) {
    const detail = (data as { detail?: string } | undefined)?.detail
    throw new ApiError(res.status, detail ?? FALLBACK_MESSAGES[res.status] ?? 'Algo deu errado. Tente de novo.')
  }
  return data as T
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
}
