import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, CheckCheck } from 'lucide-react'
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

  const deleteNotification = useMutation({
    mutationFn: (id: string) =>
      api(`/api/notifications/${id}`, { method: 'DELETE' }, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const deleteAllNotifications = useMutation({
    mutationFn: () => api('/api/notifications', { method: 'DELETE' }, token),
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
        <div style={{ display: 'flex', gap: '8px' }}>
          {unread > 0 && (
            <button
              type="button"
              className="ghost-btn"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck size={16} style={{ marginRight: '6px' }} />
              Tümünü okundu işaretle ({unread})
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              className="ghost-btn"
              style={{ color: '#ef4444' }}
              disabled={deleteAllNotifications.isPending}
              onClick={() => {
                if (window.confirm('Tüm bildirimleri silmek istediğinizden emin misiniz?')) {
                  deleteAllNotifications.mutate()
                }
              }}
            >
              <Trash2 size={16} style={{ marginRight: '6px' }} />
              Tümünü Temizle
            </button>
          )}
        </div>
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
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ flex: 1, paddingRight: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '15px' }}>{n.title}</strong>
                    {!n.isRead && (
                      <span style={{
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600
                      }}>Yeni</span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0', color: '#4b5563' }}>{n.body}</p>
                  {n.relatedEntityType === 'Land' && n.relatedEntityId && (
                    <Link to={`/app/lands/${n.relatedEntityId}`} className="text-link" onClick={(e) => e.stopPropagation()}>
                      Arazi Merkezine git →
                    </Link>
                  )}
                  {n.relatedEntityType === 'Task' && n.relatedEntityId && (
                    <Link to="/lands" className="text-link" onClick={(e) => e.stopPropagation()}>
                      Arazilere git →
                    </Link>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <time style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {new Date(n.createdAtUtc).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                  <button
                    type="button"
                    title="Bildirimi Sil"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification.mutate(n.id)
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
