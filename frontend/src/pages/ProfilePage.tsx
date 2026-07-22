import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { displayFullName, isAdmin, roleLabel } from '../auth/roles'
import '../layout/layout.css'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Profil</h1>
          <p>Oturum bilgileriniz ve demo kullanıcı notları.</p>
        </div>
      </div>

      <div className="panel">
        <div className="profile-card">
          <dl>
            <dt>Ad soyad</dt>
            <dd>{displayFullName(user?.fullName, user?.roles)}</dd>
            <dt>E-posta</dt>
            <dd>{user?.email}</dd>
            <dt>Rol</dt>
            <dd>{roleLabel(user?.roles)}</dd>
          </dl>

          <div className="seed-note">
            <strong>Demo hesaplar (seed)</strong>
            <br />
            {isAdmin(user?.roles) ? (
              <>
                Yönetici: admin@agriculture.local / Admin123!
                <br />
                Tarım Uzmanı (web + mobil): uzman@agriculture.local / Officer123!
                <br />
                Üretici (mobil): uretici@agriculture.local / Producer123!
              </>
            ) : (
              <>
                Tarım Uzmanı (web + mobil): uzman@agriculture.local / Officer123!
                <br />
                Üretici mobil hesabı yönetici tarafından verilir.
              </>
            )}
          </div>

          <div>
            <button type="button" className="primary-btn" onClick={onLogout}>
              Çıkış yap
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
