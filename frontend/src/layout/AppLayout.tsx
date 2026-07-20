import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  Moon,
  ShieldCheck,
  Sprout,
  Sun,
  User,
  Wheat,
  Workflow,
  BarChart3,
  X,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { displayFirstName, displayFullName, isAdmin, panelSubtitle, roleLabel } from '../auth/roles'
import { cn } from '../lib/utils'
import './layout.css'

type NavItem = {
  to: string
  label: string
  end?: boolean
  adminOnly?: boolean
  icon: ComponentType<{ className?: string }>
}
type NavGroup = { id: string; label: string; items: NavItem[] }

/** SDS-R16 land-first navigation */
const groups: NavGroup[] = [
  {
    id: 'hub',
    label: 'Merkez',
    items: [
      { to: '/', label: 'Operasyon Merkezi', end: true, icon: LayoutDashboard },
      { to: '/lands', label: 'Araziler', icon: Map },
      { to: '/messages', label: 'Mesajlar', icon: MessageSquare },
    ],
  },
  {
    id: 'ops',
    label: 'Saha ve üretim',
    items: [
      { to: '/inspections', label: 'Denetimler', icon: ShieldCheck },
      { to: '/harvest', label: 'Hasat ve teslimat', icon: Wheat },
      { to: '/workflows', label: 'İş akışı şablonları', icon: Workflow },
    ],
  },
  {
    id: 'monitoring',
    label: 'İzleme',
    items: [
      { to: '/reports', label: 'Raporlar', icon: BarChart3 },
    ],
  },
]

const pageTitles: Record<string, string> = {
  '/': 'Operasyon Merkezi',
  '/lands': 'Araziler',
  '/workflows': 'İş akışı şablonları',
  '/inspections': 'Denetimler',
  '/harvest': 'Hasat ve teslimat',
  '/messages': 'Mesajlar',
  '/notifications': 'Bildirimler',
  '/reports': 'Raporlar',
  '/profile': 'Profil',
  '/producers': 'Üreticiler',
  '/officers': 'Tarım uzmanları',
  '/uzmanlar': 'Tarım uzmanları',
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

function useThemeMode() {
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    const stored = localStorage.getItem('ams-theme')
    const preferDark =
      stored === 'dark' ||
      (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', preferDark)
    setDark(preferDark)
  }, [])

  function toggle() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('ams-theme', next ? 'dark' : 'light')
    setDark(next)
  }

  return { dark, toggle }
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const admin = isAdmin(user?.roles)
  const { dark, toggle } = useThemeMode()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const title = useMemo(() => {
    if (pageTitles[location.pathname]) return pageTitles[location.pathname]
    if (location.pathname.startsWith('/lands/')) return 'Arazi Merkezi'
    if (location.pathname.startsWith('/producers/')) return 'Üretici detayı'
    const match = Object.keys(pageTitles)
      .filter((k) => k !== '/')
      .find((k) => location.pathname.startsWith(k))
    return pageTitles[match ?? '/']
  }, [location.pathname])

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  const sidebar = (
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
        {groups.map((group) => {
          const items = group.items.filter((l) => !l.adminOnly || admin)
          if (!items.length) return null
          return (
            <div key={group.id} className="nav-group">
              <p className="nav-group-label">{group.label}</p>
              {items.map((link) => {
                const Icon = link.icon
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => cn('nav-link', isActive && 'active')}
                  >
                    <Icon className="nav-icon" />
                    <span>{link.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )
        })}
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

  return (
    <div className="shell">
      <aside className="sidebar desktop-sidebar">{sidebar}</aside>

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
            {sidebar}
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
            <p>Belediye Tarım Operasyon Platformu</p>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label={dark ? 'Açık temaya geç' : 'Koyu temaya geç'}
              onClick={toggle}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

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
