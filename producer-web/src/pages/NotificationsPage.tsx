import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationDto } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function NotificationsPage() {
  const { authFetch } = useAuth()
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => authFetch<NotificationDto[]>('/api/notifications'),
    refetchInterval: 30_000,
  })

  const markAll = useMutation({
    mutationFn: () => authFetch('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markOne = useMutation({
    mutationFn: (id: string) =>
      authFetch(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const items = listQuery.data ?? []
  const unread = items.filter((n) => !n.isRead).length

  return (
    <section className="page">
      <header className="page-head row">
        <div>
          <h1>Bildirimler</h1>
          <p className="muted">Görev ve sistem uyarıları</p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            className="btn ghost"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Tümünü okundu işaretle
          </button>
        ) : null}
      </header>

      {listQuery.isLoading ? <p className="empty">Yükleniyor…</p> : null}
      {listQuery.isError ? <p className="error">Bildirimler yüklenemedi.</p> : null}
      {!listQuery.isLoading && items.length === 0 ? <p className="empty">Bildirim yok.</p> : null}

      <ul className="card-list">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className={`card-link block ${n.isRead ? '' : 'unread'}`}
              onClick={() => {
                if (!n.isRead) markOne.mutate(n.id)
              }}
            >
              <strong>{n.title}</strong>
              <span>{n.body}</span>
              <em>{new Date(n.createdAtUtc).toLocaleString('tr-TR')}</em>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
