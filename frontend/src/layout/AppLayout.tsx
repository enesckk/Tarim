import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useQuery } from '@tanstack/react-query'
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

const FIELD_PROCESS_PATHS = ['/approvals', '/inspections', '/harvest', '/workflows'] as const

const fieldProcessItems: NavItem[] = [
  { to: '/approvals', label: 'Onaylar', icon: CheckSquare },
  { to: '/inspections', label: 'Denetimler', officerLabel: 'Denetimlerim', icon: ShieldCheck },
  { to: '/harvest', label: 'Hasat ve teslimat', icon: Wheat },
  { to: '/workflows', label: 'İş akışı şablonları', icon: Workflow },
]

/** Top-level flat links (group inserted after Operasyon Merkezi). */
const flatNavItems: NavItem[] = [
  { to: '/', label: 'Operasyon Merkezi', end: true, icon: LayoutDashboard },
  { to: '/lands', label: 'Araziler', officerLabel: 'Arazilerim', icon: Map },
  { to: '/producers', label: 'Üreticiler', officerLabel: 'Atanan üreticiler', icon: Users },
  { to: '/officers', label: 'Uzmanlar', adminOnly: true, icon: UserCog },
  { to: '/messages', label: 'Mesajlar', icon: MessageSquare },
  { to: '/tarim-ai', label: 'AI Destekli Analiz', icon: BrainCircuit },
  { to: '/reports', label: 'Raporlar', adminOnly: true, icon: BarChart3 },
]

function isFieldProcessRoute(pathname: string) {
  return FIELD_PROCESS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

const pageTitles: Record<string, string> = {
  '/': 'Operasyon Merkezi',
  '/approvals': 'Onaylar',
  '/lands': 'Araziler',
  '/workflows': 'İş akışı şablonları',
  '/inspections': 'Denetimler',
  '/harvest': 'Hasat ve teslimat',
  '/messages': 'Mesajlar',
  '/notifications': 'Bildirimler',
  '/reports': 'Raporlar',
  '/tarim-ai': 'AI Destekli Analiz',
  '/profile': 'Profil',
  '/producers': 'Üreticiler',
  '/officers': 'Uzmanlar',
  '/uzmanlar': 'Uzmanlar',
  '/seasons': 'Sezonlar',
  '/tasks': 'Görevler',
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
  const [menuOpen, setMenuOpen] = useState(false)
  const onFieldProcess = isFieldProcessRoute(location.pathname)
  const [fieldProcessesOpen, setFieldProcessesOpen] = useState(onFieldProcess)

  const pendingApprovals = useQuery({
    queryKey: ['pending-approval'],
    queryFn: () => api<{ id: string }[]>('/api/tasks/pending-approval', {}, token),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  })
  const pendingCount = pendingApprovals.data?.length ?? 0

  useSignalR()

  const title = useMemo(() => {
    if (location.pathname === '/lands') return admin ? 'Araziler' : 'Arazilerim'
    if (location.pathname === '/inspections') return admin ? 'Denetimler' : 'Denetimlerim'
    if (pageTitles[location.pathname]) return pageTitles[location.pathname]
    if (location.pathname.startsWith('/lands/')) return 'Arazi operasyon merkezi'
    if (location.pathname.startsWith('/producers/')) return 'Üretici detayı'
    if (location.pathname.startsWith('/officers/') || location.pathname.startsWith('/uzmanlar/'))
      return 'Uzman detayı'
    const match = Object.keys(pageTitles)
      .filter((k) => k !== '/')
      .find((k) => location.pathname.startsWith(k))
    return pageTitles[match ?? '/']
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

  function renderNavLink(link: NavItem, className?: string) {
    const Icon = link.icon
    const label = !admin && link.officerLabel ? link.officerLabel : link.label
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        className={({ isActive }) => cn('nav-link', className, isActive && 'active')}
      >
        <Icon className="nav-icon" />
        <span>{label}</span>
        {link.to === '/approvals' && pendingCount > 0 ? (
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
    <div className="shell">
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
            className="icon-btn mobile-only"
            aria-label="Menüyü aç"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </button>

          <div className="topbar-title">
            <h1>{title}</h1>
            <p>{panelSubtitle(user?.roles)}</p>
          </div>

          <div className="topbar-actions">
            <NavLink to="/notifications" className="icon-btn" aria-label="Bildirimler">
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
