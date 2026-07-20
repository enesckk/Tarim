import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { NotificationItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import '../layout/layout.css'

export function NotificationsPage() {
  const { token } = useAuth()
  const { data: items = [], error, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<NotificationItem[]>('/api/notifications', {}, token),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  })

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Bildirimler</h1>
          <p>
            Sistem ve arazi uyarıları (geciken / eksik adımlar). Sohbet mesajlarından ayrıdır —
            üretici sohbeti arazi merkezinde, personel yazışması Mesajlar’dadır.
          </p>
        </div>
      </div>

      <div className="panel">
        {isLoading && <p className="empty">Yükleniyor…</p>}
        {error && <p className="error">{(error as Error).message}</p>}
        {!isLoading && items.length === 0 && <p className="empty">Bildirim yok.</p>}
        {items.length > 0 && (
          <ul className="notification-list">
            {items.map((n) => (
              <li key={n.id} className={n.isRead ? '' : 'unread'}>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  {n.relatedEntityType === 'Land' && n.relatedEntityId && (
                    <Link to={`/lands/${n.relatedEntityId}`} className="text-link">
                      Arazi Merkezine git
                    </Link>
                  )}
                </div>
                <time>
                  {new Date(n.createdAtUtc).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
