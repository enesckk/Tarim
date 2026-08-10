import { useQuery } from '@tanstack/react-query'
import type { MeResponse } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { roleLabel } from '../auth/roles'
import { registerWebPush } from '../notifications/webPush'
import { useState } from 'react'

export function ProfilePage() {
  const { user, accessToken, signOut, authFetch } = useAuth()
  const [pushMsg, setPushMsg] = useState<string | null>(null)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => authFetch<MeResponse>('/api/me'),
  })

  return (
    <section className="page">
      <header className="page-head">
        <h1>Profil</h1>
        <p className="muted">Oturum ve bildirim ayarları</p>
      </header>

      <div className="profile-card">
        <dl>
          <dt>Ad soyad</dt>
          <dd>{meQuery.data?.fullName || user?.fullName}</dd>
          <dt>E-posta / telefon</dt>
          <dd>{meQuery.data?.email || meQuery.data?.phone || user?.email}</dd>
          <dt>Rol</dt>
          <dd>{roleLabel(user?.roles)}</dd>
        </dl>

        <button
          type="button"
          className="btn ghost wide"
          onClick={async () => {
            const ok = await registerWebPush(accessToken)
            setPushMsg(
              ok
                ? 'Bildirimler açıldı. Ana ekrana ekli uygulamada da çalışır.'
                : 'Bildirim izni verilmedi veya tarayıcı desteklemiyor.',
            )
          }}
        >
          Bildirimleri etkinleştir
        </button>
        {pushMsg ? <p className="muted">{pushMsg}</p> : null}

        <p className="hint">
          Kurulum: tarayıcı menüsünden “Ana ekrana ekle / Install app”. Ardından uygulama logosundan
          açın — mağaza indirmeye gerek yok.
        </p>

        <button type="button" className="btn danger wide" onClick={signOut}>
          Çıkış yap
        </button>
      </div>
    </section>
  )
}
