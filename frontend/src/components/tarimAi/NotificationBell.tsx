import { useState, useEffect } from 'react'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: any) => !n.readAt).length)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      fetchNotifications()
    } catch (e) {
      console.error(e)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      fetchNotifications()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 focus:outline-none"
      >
        {/* Simple bell icon SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 border-2 border-white rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
            <h3 className="font-semibold text-slate-900">Bildirimler</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Tümünü Okundu İşaretle
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                Henüz bildiriminiz yok.
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id}
                  className={`p-3 rounded-lg flex flex-col gap-1 cursor-pointer transition-colors ${
                    notif.readAt ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50 border border-blue-100'
                  }`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium text-sm text-slate-900">{notif.title}</span>
                    <span className="text-[10px] text-slate-500 shrink-0 whitespace-nowrap">
                      {new Date(notif.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{notif.message}</p>
                  
                  {notif.priority === 'CRITICAL' && (
                    <span className="text-[10px] font-bold text-red-600 mt-1 uppercase tracking-wider">Kritik Uyarı</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
