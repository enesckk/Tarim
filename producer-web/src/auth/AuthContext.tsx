import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  api,
  ApiError,
  login as apiLogin,
  refresh as apiRefresh,
  type LoginResponse,
} from '../api/client'
import { canUseProducerPwa } from './roles'
import {
  clearSession,
  loadSession,
  saveSession,
  updateTokens,
  type StoredUser,
} from './session'
import { registerWebPush } from '../notifications/webPush'

type AuthState = {
  ready: boolean
  user: StoredUser | null
  accessToken: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  authFetch: <T>(path: string, options?: RequestInit) => Promise<T>
}

const AuthContext = createContext<AuthState | null>(null)

function toUser(response: LoginResponse): StoredUser {
  return {
    userId: response.userId,
    email: response.email,
    fullName: response.fullName,
    roles: response.roles,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<StoredUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)

  useEffect(() => {
    const session = loadSession()
    if (session && canUseProducerPwa(session.user.roles)) {
      setAccessToken(session.accessToken)
      setRefreshToken(session.refreshToken)
      setUser(session.user)
    } else if (session) {
      clearSession()
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!accessToken) return
    void registerWebPush(accessToken)
  }, [accessToken])

  const signOut = useCallback(() => {
    clearSession()
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email.trim(), password)
    if (!canUseProducerPwa(response.roles)) {
      throw new ApiError('Bu hesap üretici uygulamasına giriş için yetkili değil.', 403)
    }
    const nextUser = toUser(response)
    saveSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: nextUser,
    })
    setAccessToken(response.accessToken)
    setRefreshToken(response.refreshToken)
    setUser(nextUser)
  }, [])

  const authFetch = useCallback(
    async <T,>(path: string, options: RequestInit = {}) => {
      try {
        return await api<T>(path, options, accessToken)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401 && refreshToken) {
          try {
            const refreshed = await apiRefresh(refreshToken)
            if (!canUseProducerPwa(refreshed.roles)) {
              signOut()
              throw err
            }
            updateTokens(refreshed.accessToken, refreshed.refreshToken)
            setAccessToken(refreshed.accessToken)
            setRefreshToken(refreshed.refreshToken)
            setUser(toUser(refreshed))
            return await api<T>(path, options, refreshed.accessToken)
          } catch {
            signOut()
            throw err
          }
        }
        throw err
      }
    },
    [accessToken, refreshToken, signOut],
  )

  const value = useMemo(
    () => ({ ready, user, accessToken, signIn, signOut, authFetch }),
    [ready, user, accessToken, signIn, signOut, authFetch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
