import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { InstallBanner } from './components/InstallBanner'
import { LoginPage } from './pages/LoginPage'
import { TasksPage } from './pages/TasksPage'
import { TaskDetailPage } from './pages/TaskDetailPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { MessagesPage, ChatThreadPage } from './pages/MessagesPage'
import { ProfilePage } from './pages/ProfilePage'
import { useQuery } from '@tanstack/react-query'
import type { NotificationDto } from './api/client'

function ProtectedShell() {
  const { ready, user, authFetch } = useAuth()
  const unreadQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => authFetch<NotificationDto[]>('/api/notifications'),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  })
  const unread = (unreadQuery.data ?? []).filter((n) => !n.isRead).length

  if (!ready) return <p className="empty center">Yükleniyor…</p>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <InstallBanner />
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Ana menü">
        <NavLink to="/tasks">Görevler</NavLink>
        <NavLink to="/messages">Sohbet</NavLink>
        <NavLink to="/notifications" className="tab-with-badge">
          Bildirimler
          {unread > 0 ? <span className="badge">{unread > 99 ? '99+' : unread}</span> : null}
        </NavLink>
        <NavLink to="/profile">Profil</NavLink>
      </nav>
    </div>
  )
}

export default function App() {
  const { ready, user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={ready && user ? <Navigate to="/tasks" replace /> : <LoginPage />}
      />
      <Route element={<ProtectedShell />}>
        <Route index element={<Navigate to="/tasks" replace />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="messages/:conversationId" element={<ChatThreadPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/tasks' : '/login'} replace />} />
    </Routes>
  )
}
