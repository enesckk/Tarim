import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { NotificationItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import '../layout/layout.css'

export function NotificationsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const { data: items = [], error, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<NotificationItem[]>('/api/notifications', {}, token),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) =>
      api(`/api/notifications/${id}/read`, { method: 'POST' }, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => api('/api/notifications/read-all', { method: 'POST' }, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unread = items.filter((n) => !n.isRead).length

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
        {unread > 0 && (
          <button
            type="button"
            className="ghost-btn"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Tümünü okundu işaretle ({unread})
          </button>
        )}
      </div>

      <div className="panel">
        {isLoading && <p className="empty">Yükleniyor…</p>}
        {error && <p className="error">{(error as Error).message}</p>}
        {!isLoading && items.length === 0 && <p className="empty">Bildirim yok.</p>}
        {items.length > 0 && (
          <ul className="notification-list">
            {items.map((n) => (
              <li
                key={n.id}
                className={n.isRead ? '' : 'unread'}
                onClick={() => {
                  if (!n.isRead) markRead.mutate(n.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !n.isRead) markRead.mutate(n.id)
                }}
                role="button"
                tabIndex={0}
              >
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  {n.relatedEntityType === 'Land' && n.relatedEntityId && (
                    <Link to={`/lands/${n.relatedEntityId}`} className="text-link">
                      Arazi Merkezine git
                    </Link>
                  )}
                  {n.relatedEntityType === 'Task' && n.relatedEntityId && (
                    <Link to="/lands" className="text-link">
                      Arazilere git
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
