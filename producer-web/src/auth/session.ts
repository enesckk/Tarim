const KEY = 'tarim-producer-pwa-session'

export type StoredUser = {
  userId: string
  email: string
  fullName: string
  roles: string[]
}

export type Session = {
  accessToken: string
  refreshToken: string
  user: StoredUser
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}

export function updateTokens(accessToken: string, refreshToken: string) {
  const current = loadSession()
  if (!current) return
  saveSession({ ...current, accessToken, refreshToken })
}
