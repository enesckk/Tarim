import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { NotificationItem } from '../../api/types'

export function NotificationBell() {
  const { token } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const fetchNotifications = async () => {
    if (!token) return
    try {
      const data = await api<NotificationItem[]>('/api/notifications', {}, token)
      setNotifications(data ?? [])
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [token])

  // Close dropdown on outside click or escape
  useEffect(() => {
    if (!isOpen) return undefined
    function onDocClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const markAsRead = async (id: string) => {
    if (!token) return
    try {
      await api(`/api/notifications/${id}/read`, { method: 'POST' }, token)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      )
    } catch (e) {
      console.error(e)
    }
  }

  const markAllAsRead = async () => {
    if (!token) return
    setLoading(true)
    try {
      await api('/api/notifications/read-all', { method: 'POST' }, token)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Bildirimler"
        aria-expanded={isOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors focus:outline-none"
      >
        <Bell size={18} aria-hidden="true" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-80 max-w-[340px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[75vh]">
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Bildirimler</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {unreadCount} yeni
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={loading}
                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium transition-colors"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                Tümünü Oku
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                Henüz bildiriminiz bulunmuyor.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-2.5 rounded-xl flex flex-col gap-1 cursor-pointer transition-all ${
                    notif.isRead
                      ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 opacity-75'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40'
                  }`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                      {new Date(notif.createdAtUtc).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {notif.body}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
