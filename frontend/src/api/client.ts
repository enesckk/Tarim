const configuredApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''
// Vercel proxies API traffic through the same origin. This avoids browser/network
// cross-site restrictions and keeps the HttpOnly media cookie first-party.
const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')
  ? '/backend'
  : configuredApiBase

export { API_BASE }

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  expiresAtUtc: string
  userId: string
  email: string
  fullName: string
  roles: string[]
}

export type RefreshResponse = {
  accessToken: string
  refreshToken: string
  expiresAtUtc: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type AuthTokens = {
  token: string | null
  refreshToken: string | null
}

let tokenGetter: (() => AuthTokens) | null = null
let onTokensRefreshed: ((access: string, refresh: string) => void) | null = null
let onAuthFailure: (() => void) | null = null
let refreshInFlight: Promise<string | null> | null = null

export function configureApiAuth(options: {
  getTokens: () => AuthTokens
  onRefreshed: (access: string, refresh: string) => void
  onFailure: () => void
}) {
  tokenGetter = options.getTokens
  onTokensRefreshed = options.onRefreshed
  onAuthFailure = options.onFailure
}

export function currentAccessToken(): string | null {
  return tokenGetter?.().token ?? null
}

export function refreshTokenAvailable(): boolean {
  return Boolean(tokenGetter?.().refreshToken)
}

export async function tryRefresh(): Promise<string | null> {
  if (!tokenGetter || !onTokensRefreshed) return null
  const { refreshToken } = tokenGetter()
  if (!refreshToken) return null

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!response.ok) return null
        const body = (await response.json()) as RefreshResponse
        onTokensRefreshed(body.accessToken, body.refreshToken)
        return body.accessToken
      } catch {
        return null
      } finally {
        refreshInFlight = null
      }
    })()
  }

  return refreshInFlight
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const authToken = token ?? tokenGetter?.().token
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && refreshTokenAvailable()) {
    const next = await tryRefresh()
    if (next) {
      headers.set('Authorization', `Bearer ${next}`)
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' })
      return parseResponse<T>(retry)
    }
    onAuthFailure?.()
  }

  return parseResponse<T>(response)
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `İstek başarısız (${response.status})`
    try {
      const body = await response.json()
      const validationMessage =
        body.errors && typeof body.errors === 'object'
          ? Object.values(body.errors).flat().find((value) => typeof value === 'string')
          : null
      message =
        body.message ??
        body.Message ??
        validationMessage ??
        body.detail ??
        (body.title && body.title !== 'One or more validation errors occurred.'
          ? body.title
          : null) ??
        message
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
