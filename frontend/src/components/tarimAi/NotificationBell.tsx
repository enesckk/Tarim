import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { NotificationItem } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'

/** AI sayfası için küçük bildirim zili — AMS /api/notifications (auth’lu). */
export function NotificationBell() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  const { data: items = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<NotificationItem[]>('/api/notifications', {}, token),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  })

  const unreadCount = items.filter((n) => !n.isRead).length
  const preview = items.slice(0, 6)

  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: 'POST' }, token),
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 focus:outline-none"
        aria-label="Bildirimler"
        aria-expanded={isOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-bold text-white bg-red-500 border-2 border-white rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
            <h3 className="font-semibold text-slate-900">Bildirimler</h3>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                disabled={markAll.isPending}
              >
                Tümünü okundu işaretle
              </button>
            ) : null}
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {preview.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">Henüz bildiriminiz yok.</div>
            ) : (
              preview.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  className={`w-full text-left p-3 rounded-lg flex flex-col gap-1 transition-colors ${
                    notif.isRead
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-blue-50/50 hover:bg-blue-50 border border-blue-100'
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markRead.mutate(notif.id)
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium text-sm text-slate-900">{notif.title}</span>
                    <span className="text-[10px] text-slate-500 shrink-0 whitespace-nowrap">
                      {new Date(notif.createdAtUtc).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{notif.body}</p>
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t bg-slate-50">
            <Link
              to="/app/notifications"
              className="block text-center text-sm font-medium text-emerald-700 hover:text-emerald-800 py-2"
              onClick={() => setIsOpen(false)}
            >
              Tüm bildirimleri aç
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
