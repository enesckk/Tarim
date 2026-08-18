/* eslint-disable react/only-export-components -- Provider and its hook intentionally share one module. */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, configureApiAuth, type LoginResponse } from '../api/client'
import { isProducer, isStaff } from './roles'

type AuthUser = Omit<LoginResponse, 'accessToken' | 'refreshToken' | 'expiresAtUtc'>

type AuthState = {
  token: string | null
  refreshToken: string | null
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)
const STORAGE_KEY = 'agriculture.auth'

type StoredAuth = {
  token: string
  refreshToken: string
  user: AuthUser
}

function loadStored(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

function persist(next: StoredAuth | null) {
  if (!next) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadStored()
  const [token, setToken] = useState<string | null>(stored?.token ?? null)
  const [refreshToken, setRefreshToken] = useState<string | null>(stored?.refreshToken ?? null)
  const [user, setUser] = useState<AuthUser | null>(stored?.user ?? null)
  // API requests made by a page immediately after login must see the new token.
  // State updates are asynchronous, so keep the transport session in a ref too.
  const sessionRef = useRef({
    token: stored?.token ?? null,
    refreshToken: stored?.refreshToken ?? null,
  })
  const userRef = useRef<AuthUser | null>(stored?.user ?? null)

  useEffect(() => {
    configureApiAuth({
      getTokens: () => sessionRef.current,
      onRefreshed: (access, refresh) => {
        sessionRef.current = { token: access, refreshToken: refresh }
        setToken(access)
        setRefreshToken(refresh)
        if (userRef.current) {
          persist({ token: access, refreshToken: refresh, user: userRef.current })
        }
      },
      onFailure: () => {
        sessionRef.current = { token: null, refreshToken: null }
        userRef.current = null
        setToken(null)
        setRefreshToken(null)
        setUser(null)
        persist(null)
      },
    })
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      token,
      refreshToken,
      user,
      async login(email, password) {
        const response = await api<LoginResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        const nextUser: AuthUser = {
          userId: response.userId,
          email: response.email,
          fullName: response.fullName,
          roles: response.roles,
        }
        if (!isStaff(nextUser.roles) && !isProducer(nextUser.roles)) {
          throw new Error('Bu kullanıcı rolünün web uygulamasına erişim yetkisi yok.')
        }
        sessionRef.current = {
          token: response.accessToken,
          refreshToken: response.refreshToken,
        }
        userRef.current = nextUser
        setToken(response.accessToken)
        setRefreshToken(response.refreshToken)
        setUser(nextUser)
        persist({
          token: response.accessToken,
          refreshToken: response.refreshToken,
          user: nextUser,
        })
        return nextUser
      },
      logout() {
        const activeToken = sessionRef.current.token
        if (activeToken) {
          void api('/api/auth/logout', { method: 'POST' }, activeToken).catch(() => {
            // Local credentials are cleared even if the server is temporarily unreachable.
          })
        }
        sessionRef.current = { token: null, refreshToken: null }
        userRef.current = null
        setToken(null)
        setRefreshToken(null)
        setUser(null)
        persist(null)
      },
    }),
    [token, refreshToken, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
