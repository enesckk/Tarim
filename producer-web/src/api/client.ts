export type LoginResponse = {
  accessToken: string
  refreshToken: string
  expiresAtUtc: string
  userId: string
  email: string
  fullName: string
  roles: string[]
}

export type TaskDto = {
  id: string
  producerId: string
  landId: string
  landName?: string | null
  title: string
  description?: string | null
  dueDate?: string | null
  status: number
  requiresPhoto: boolean
  revisionReason?: string | null
  theme?: string | null
  photoCount?: number
}

export type NotificationDto = {
  id: string
  title: string
  body: string
  isRead: boolean
  createdAtUtc: string
  relatedEntityType?: string | null
  relatedEntityId?: string | null
}

export type ConversationListItem = {
  id: string
  subject: string
  lastMessagePreview?: string | null
  lastMessageAtUtc?: string | null
  hasUnread?: boolean
  landName?: string | null
}

export type ChatMessageDto = {
  id: string
  senderUserId: string
  body: string
  sentAtUtc: string
}

export type ConversationDetail = {
  id: string
  subject: string
  producerUserId: string
  messages: ChatMessageDto[]
}

export type MeResponse = {
  userId: string
  email?: string | null
  roles: string[]
  producerId?: string | null
  fullName?: string | null
  phone?: string | null
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `İstek başarısız (${response.status})`
    try {
      const body = await response.json()
      message = body.message ?? body.Message ?? body.title ?? message
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

export async function api<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError('Bağlantı kurulamadı. İnternetinizi kontrol edin.', 0)
  }
  return parseResponse<T>(response)
}

export function login(email: string, password: string) {
  return api<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function refresh(refreshToken: string) {
  return api<LoginResponse>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}
