import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSignalR } from '../hooks/useSignalR'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  ShieldCheck,
  Sprout,
  User,
  Users,
  UserCog,
  Wheat,
  Workflow,
  BarChart3,
  BrainCircuit,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { displayFirstName, displayFullName, isAdmin, panelSubtitle, roleLabel } from '../auth/roles'
import { cn } from '../lib/utils'
import './layout.css'

type NavItem = {
  to: string
  label: string
  end?: boolean
  adminOnly?: boolean
  officerLabel?: string
  icon: ComponentType<{ className?: string }>
}

const FIELD_PROCESS_PATHS = ['/app/approvals', '/app/inspections', '/app/harvest', '/app/workflows'] as const

const fieldProcessItems: NavItem[] = [
  { to: '/app/approvals', label: 'Onaylar', icon: CheckSquare },
  { to: '/app/inspections', label: 'Denetimler', officerLabel: 'Denetimlerim', icon: ShieldCheck },
  { to: '/app/harvest', label: 'Hasat ve teslimat', icon: Wheat },
  { to: '/app/workflows', label: 'İş akışı şablonları', icon: Workflow },
]

/** Top-level flat links (group inserted after Operasyon Merkezi). */
const flatNavItems: NavItem[] = [
  { to: '/app', label: 'Operasyon Merkezi', end: true, icon: LayoutDashboard },
  { to: '/app/lands', label: 'Araziler', officerLabel: 'Arazilerim', icon: Map },
  { to: '/app/producers', label: 'Üreticiler', officerLabel: 'Atanan üreticiler', icon: Users },
  { to: '/app/officers', label: 'Uzmanlar', adminOnly: true, icon: UserCog },
  { to: '/app/messages', label: 'Mesajlar', icon: MessageSquare },
  { to: '/app/tarim-ai', label: 'AI Destekli Analiz', icon: BrainCircuit },
  { to: '/app/reports', label: 'Raporlar', adminOnly: true, icon: BarChart3 },
]

function isFieldProcessRoute(pathname: string) {
  return FIELD_PROCESS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

const pageTitles: Record<string, string> = {
  '/app': 'Operasyon Merkezi',
  '/app/approvals': 'Onaylar',
  '/app/lands': 'Araziler',
  '/app/workflows': 'İş akışı şablonları',
  '/app/inspections': 'Denetimler',
  '/app/harvest': 'Hasat ve teslimat',
  '/app/messages': 'Mesajlar',
  '/app/notifications': 'Bildirimler',
  '/app/reports': 'Raporlar',
  '/app/tarim-ai': 'AI Destekli Analiz',
  '/app/profile': 'Profil',
  '/app/producers': 'Üreticiler',
  '/app/officers': 'Uzmanlar',
  '/app/uzmanlar': 'Uzmanlar',
  '/app/seasons': 'Sezonlar',
  '/app/tasks': 'Görevler',
}

function initials(name?: string) {
  if (!name?.trim()) return 'TY'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('tr') ?? '')
    .join('')
}

export function AppLayout() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const admin = isAdmin(user?.roles)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ams_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const onFieldProcess = isFieldProcessRoute(location.pathname)
  const [fieldProcessesOpen, setFieldProcessesOpen] = useState(onFieldProcess)

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const toggleSidebar = () => {
    if (window.innerWidth <= 960) {
      setMobileOpen((v) => !v)
    } else {
      setSidebarCollapsed((v) => {
        const next = !v
        try {
          localStorage.setItem('ams_sidebar_collapsed', String(next))
        } catch {
          // ignore
        }
        return next
      })
    }
  }

  const pendingApprovals = useQuery({
    queryKey: ['pending-approval'],
    queryFn: () => api<{ id: string }[]>('/api/tasks/pending-approval', {}, token),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  })
  const pendingCount = pendingApprovals.data?.length ?? 0

  useSignalR()

  const title = useMemo(() => {
    if (location.pathname === '/app/lands') return admin ? 'Araziler' : 'Arazilerim'
    if (location.pathname === '/app/inspections') return admin ? 'Denetimler' : 'Denetimlerim'
    if (pageTitles[location.pathname]) return pageTitles[location.pathname]
    if (location.pathname.startsWith('/app/lands/')) return 'Arazi operasyon merkezi'
    if (location.pathname.startsWith('/app/producers/')) return 'Üretici detayı'
    if (location.pathname.startsWith('/app/officers/') || location.pathname.startsWith('/app/uzmanlar/'))
      return 'Uzman detayı'
    const match = Object.keys(pageTitles)
      .filter((k) => k !== '/app')
      .find((k) => location.pathname.startsWith(k))
    return pageTitles[match ?? '/app']
  }, [location.pathname, admin])

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('ams-theme')
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (onFieldProcess) setFieldProcessesOpen(true)
  }, [onFieldProcess])

  const queryClient = useQueryClient()

  const prefetchRoute = (path: string) => {
    if (!token) return
    if (path === '/app') {
      void queryClient.prefetchQuery({
        queryKey: ['operations-center'],
        queryFn: () => api('/api/dashboard', {}, token),
      })
    } else if (path === '/app/lands') {
      void queryClient.prefetchQuery({
        queryKey: ['lands'],
        queryFn: () => api('/api/lands', {}, token),
      })
    } else if (path === '/app/producers') {
      void queryClient.prefetchQuery({
        queryKey: ['producers'],
        queryFn: () => api('/api/producers', {}, token),
      })
    } else if (path === '/app/officers') {
      void queryClient.prefetchQuery({
        queryKey: ['officers'],
        queryFn: () => api('/api/officers', {}, token),
      })
    } else if (path === '/app/approvals') {
      void queryClient.prefetchQuery({
        queryKey: ['pending-approval'],
        queryFn: () => api('/api/tasks/pending-approval', {}, token),
      })
    } else if (path === '/app/workflows') {
      void queryClient.prefetchQuery({
        queryKey: ['workflows'],
        queryFn: () => api('/api/workflows', {}, token),
      })
    } else if (path === '/app/inspections') {
      void queryClient.prefetchQuery({
        queryKey: ['inspections'],
        queryFn: () => api('/api/inspections', {}, token),
      })
    } else if (path === '/app/harvest') {
      void queryClient.prefetchQuery({
        queryKey: ['harvest'],
        queryFn: () => api('/api/harvest', {}, token),
      })
    }
  }

  // Pre-warm primary datasets in background on login
  useEffect(() => {
    if (!token) return
    prefetchRoute('/app')
    prefetchRoute('/app/lands')
    prefetchRoute('/app/producers')
    prefetchRoute('/app/approvals')
  }, [token])

  function renderNavLink(link: NavItem, className?: string) {
    const Icon = link.icon
    const label = !admin && link.officerLabel ? link.officerLabel : link.label
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        onMouseEnter={() => prefetchRoute(link.to)}
        onFocus={() => prefetchRoute(link.to)}
        className={({ isActive }) => cn('nav-link', className, isActive && 'active')}
      >
        <Icon className="nav-icon" />
        <span>{label}</span>
        {link.to === '/app/approvals' && pendingCount > 0 ? (
          <span className="nav-count" aria-label={`${pendingCount} bekleyen onay`}>
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        ) : null}
      </NavLink>
    )
  }

  function renderSidebar() {
    const visibleFlat = flatNavItems.filter((l) => !l.adminOnly || admin)
    const [opsCenter, ...restFlat] = visibleFlat

    return (
      <>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Sprout className="size-5" />
          </div>
          <div className="brand-copy">
            <span className="brand-mark">Tarım</span>
            <p>{panelSubtitle(user?.roles)}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group nav-group-flat">
            {opsCenter ? renderNavLink(opsCenter) : null}

            <div className={cn('nav-collapsible', fieldProcessesOpen && 'open')}>
              <button
                type="button"
                className={cn('nav-group-toggle', onFieldProcess && 'active')}
                aria-expanded={fieldProcessesOpen}
                onClick={() => setFieldProcessesOpen((v) => !v)}
              >
                <ClipboardList className="nav-icon" />
                <span>Saha süreçleri</span>
                <ChevronDown
                  className={cn('nav-chevron', fieldProcessesOpen && 'open')}
                  aria-hidden
                />
              </button>
              {fieldProcessesOpen ? (
                <div className="nav-subitems" role="group" aria-label="Saha süreçleri">
                  {fieldProcessItems.map((link) => renderNavLink(link, 'nav-sublink'))}
                </div>
              ) : null}
            </div>

            {restFlat.map((link) => renderNavLink(link))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-avatar">
            {initials(displayFullName(user?.fullName, user?.roles))}
          </div>
          <div className="sidebar-user-meta">
            <span className="sidebar-user-name">
              {displayFullName(user?.fullName, user?.roles)}
            </span>
            <span className="sidebar-user-email">{user?.email ?? roleLabel(user?.roles)}</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={cn('shell', sidebarCollapsed && 'sidebar-collapsed')}>
      <aside className="sidebar desktop-sidebar">{renderSidebar()}</aside>

      {mobileOpen && (
        <div className="mobile-drawer" role="dialog" aria-modal="true">
          <button
            type="button"
            className="mobile-backdrop"
            aria-label="Menüyü kapat"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="sidebar mobile-sidebar">
            <button
              type="button"
              className="mobile-close"
              aria-label="Kapat"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" />
            </button>
            {renderSidebar()}
          </aside>
        </div>
      )}

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn"
            aria-label={sidebarCollapsed ? 'Menüyü aç' : 'Menüyü kapat'}
            title={sidebarCollapsed ? 'Menüyü aç' : 'Menüyü daralt'}
            onClick={toggleSidebar}
          >
            <Menu className="size-4" />
          </button>

          <div className="topbar-title">
            <h1>{title}</h1>
            <p>{panelSubtitle(user?.roles)}</p>
          </div>

          <div className="topbar-actions">
            <NavLink to="/app/notifications" className="icon-btn" aria-label="Bildirimler">
              <Bell className="size-4" />
            </NavLink>

            <div className="user-menu">
              <button
                type="button"
                className="user-menu-trigger"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span className="user-menu-avatar">
                  {initials(displayFullName(user?.fullName, user?.roles))}
                </span>
                <span className="user-menu-label">
                  {displayFirstName(user?.fullName, user?.roles)}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div className="user-menu-panel">
                  <div className="user-menu-head">
                    <strong>{displayFullName(user?.fullName, user?.roles)}</strong>
                    <span>{user?.email}</span>
                  </div>
                  <NavLink to="/profile" className="user-menu-item" onClick={() => setMenuOpen(false)}>
                    <User className="size-4" />
                    Profil
                  </NavLink>
                  <button type="button" className="user-menu-item danger" onClick={onLogout}>
                    <LogOut className="size-4" />
                    Çıkış yap
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
