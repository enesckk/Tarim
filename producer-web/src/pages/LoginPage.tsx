import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { user, signIn } = useAuth()
  const [email, setEmail] = useState(import.meta.env.DEV ? '5537472823' : '')
  const [password, setPassword] = useState(import.meta.env.DEV ? 'asd' : '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/tasks" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 403
            ? err.message
            : err.status === 0
              ? err.message
              : 'Telefon / e-posta veya şifre hatalı.',
        )
      } else {
        setError('Giriş yapılamadı.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand-mark" aria-hidden>
          <img src="/icons/pwa-192.png" alt="" width={56} height={56} />
        </div>
        <h1>Tarım</h1>
        <p className="muted">Üretici uygulaması — ana ekrana ekleyip kullanın.</p>
        <label>
          Telefon veya e-posta
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Şifre
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary wide" type="submit" disabled={loading}>
          {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </form>
    </div>
  )
}
