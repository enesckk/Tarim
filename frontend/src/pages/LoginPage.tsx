import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sprout } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { homePathForRoles } from '../auth/roles'
import '../layout/layout.css'

export function LoginPage() {
  const { token, user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    searchParams.get('reason') === 'staff'
      ? 'Bu hesap operasyon paneline giriş için yetkili değil.'
      : null,
  )
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const nextUser = await login(email, password)
      navigate(homePathForRoles(nextUser.roles), { replace: true })
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Giriş başarısız'
      const lower = raw.toLocaleLowerCase('tr-TR')
      if (/invalid email or password|unauthorized|401/.test(lower)) {
        setError('E-posta veya şifre hatalı.')
      } else if (/failed to fetch|network|timeout|load failed|err_connection|econnrefused/.test(lower)) {
        setError('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.')
      } else if (/forbidden|403|yetki/.test(lower)) {
        setError('Bu hesapla panele giriş yetkiniz yok.')
      } else if (/^https?:\/\//i.test(raw) || /exception|stack|at\s+\w+/.test(raw)) {
        setError('Giriş yapılamadı. Lütfen tekrar deneyin.')
      } else {
        setError(raw)
      }
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

        {token && user && (
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(26,107,60,0.1)', border: '1px solid rgba(26,107,60,0.3)', marginBottom: '16px', fontSize: '13px' }}>
            <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '6px' }}>
              ✓ Aktif Oturum: {user.fullName ?? user.email}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="primary-btn"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => navigate(homePathForRoles(user.roles))}
              >
                Operasyon paneline git →
              </button>
              <button
                type="button"
                style={{ padding: '6px 12px', fontSize: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                onClick={() => logout()}
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        )}
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
        {import.meta.env.DEV ? (
          <div className="login-hint">
            Demo yönetici: <code>admin@agriculture.local</code> / <code>Admin123!</code>
            <br />
            Demo uzman (web + mobil): <code>uzman@agriculture.local</code> / <code>Officer123!</code>
          </div>
        ) : null}
      </div>
    </div>
  )
}
