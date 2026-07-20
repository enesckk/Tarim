import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Sprout } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { homePathForRoles } from '../auth/roles'
import '../layout/layout.css'

export function LoginPage() {
  const { token, user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@agriculture.local')
  const [password, setPassword] = useState('Admin123!')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (token && user) return <Navigate to={homePathForRoles(user.roles)} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const nextUser = await login(email, password)
      navigate(homePathForRoles(nextUser.roles), { replace: true })
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Giriş başarısız'
      setError(
        /invalid email or password/i.test(raw)
          ? 'E-posta veya şifre hatalı.'
          : raw,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Sprout className="size-5" />
          </div>
          <div>
            <h1>Tarım</h1>
          </div>
        </div>
        <p className="login-lead">
          Belediye Tarım Operasyon Platformu — Yönetici ve Tarım Uzmanı girişi.
        </p>
        <form onSubmit={onSubmit}>
          <label>
            E-posta
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@belediye.gov.tr"
              required
              autoComplete="username"
            />
          </label>
          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifreniz"
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </form>
        <div className="login-hint">
          Demo: <code>admin@agriculture.local</code> / <code>Admin123!</code>
          <br />
          Uzman: <code>uzman@agriculture.local</code> / <code>Officer123!</code>
        </div>
      </div>
    </div>
  )
}
