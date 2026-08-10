import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Map,
  MessageSquare,
  Plus,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
import { api } from '../api/client'
import type { OperationsSummary, TaskItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/roles'
import { LandStatusMap } from '../components/LandStatusMap'
import '../layout/layout.css'

/** Seed/demo accounts often use "System Administrator" — never show that as a greeting. */
const BLOCKED_FIRST_NAMES = new Set([
  'system',
  'sistem',
  'administrator',
  'admin',
])

function formatDate(value?: string) {
  if (!value) return null
  return new Date(value).toLocaleDateString('tr-TR')
}

function alertStepTitle(item: { title?: string; message?: string }) {
  const title = item.title?.trim()
  if (title) return title
  return 'Görev adımı'
}

function alertLandLabel(item: { landName?: string; landId?: string }) {
  if (item.landName?.trim()) return item.landName.trim()
  if (item.landId) return 'Arazi'
  return null
}

function greetingFirstName(fullName?: string) {
  if (!fullName?.trim()) return null
  const first = fullName.trim().split(/\s+/)[0]
  if (!first) return null
  const key = first.toLocaleLowerCase('tr-TR')
  if (BLOCKED_FIRST_NAMES.has(key)) return null
  return first
}

const ALERT_PREVIEW_COUNT = 2

export function DashboardPage() {
  const { token, user } = useAuth()
  const location = useLocation()
  const admin = isAdmin(user?.roles)
  const name = greetingFirstName(user?.fullName)
  const [alertsExpanded, setAlertsExpanded] = useState(false)

  const { data, error, isLoading } = useQuery({
    queryKey: ['operations-center'],
    queryFn: () => api<OperationsSummary>('/api/dashboard', {}, token),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  })

  const pendingApprovals = useQuery({
    queryKey: ['pending-approval'],
    queryFn: () => api<TaskItem[]>('/api/tasks/pending-approval', {}, token),
    enabled: Boolean(token),
    refetchInterval: 30_000,
  })
  const pendingCount = (pendingApprovals.data ?? []).filter((t) => t.status === 5).length

  const allAlerts = data?.landAlerts ?? data?.overdueTaskItems ?? []
  const visibleAlerts = alertsExpanded
    ? allAlerts
    : allAlerts.slice(0, ALERT_PREVIEW_COUNT)

  const title = name ?? 'Operasyon Merkezi'

  useEffect(() => {
    if (location.hash !== '#uyarilar') return
    setAlertsExpanded(true)
    const el = document.getElementById('uyarilar')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, data])

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <div className="ops-hero-text">
          <h2>{title}</h2>
          <p>
            {admin
              ? 'Belediye Tarım Operasyon Platformu'
              : 'Atandığınız arazilerdeki saha operasyonları'}
          </p>
        </div>
      </header>

      {error && <p className="error">{(error as Error).message}</p>}
      {isLoading && <p className="empty">Yükleniyor…</p>}

      {data && (
        <>
          <LandStatusMap lands={data.mapLands ?? []} />

          <div className="ops-main">
            <section
              className={`ops-panel ops-alerts-panel${alertsExpanded ? ' is-expanded' : ' is-compact'}`}
              id="uyarilar"
            >
              <div className="ops-panel-head">
                <div className="ops-panel-head-main">
                  <h3>Acil uyarılar</h3>
                  {allAlerts.length > 0 ? (
                    <span className="ops-alert-count">{allAlerts.length}</span>
                  ) : null}
                </div>
                <Link to="/app/lands" className="text-link">
                  Araziler
                </Link>
              </div>
              {allAlerts.length === 0 ? (
                <div className="ops-empty ops-empty-compact">
                  <CheckCircle2 className="ops-empty-icon" aria-hidden />
                  <p>Şu an açık acil uyarı yok.</p>
                </div>
              ) : (
                <>
                  <ul className="ops-alerts">
                    {visibleAlerts.map((a) => {
                      const landId = 'landId' in a ? a.landId : undefined
                      const landName = alertLandLabel({
                        landName: 'landName' in a ? a.landName : undefined,
                        landId,
                      })
                      const stepTitle = alertStepTitle({
                        title: 'title' in a ? a.title : undefined,
                        message: 'message' in a ? a.message : undefined,
                      })
                      const due = formatDate(
                        'dueDate' in a ? (a.dueDate as string | undefined) : undefined,
                      )
                      const compact = !alertsExpanded
                      const body = (
                        <>
                          <span className="ops-alert-icon" aria-hidden>
                            <AlertTriangle size={compact ? 13 : 15} />
                          </span>
                          <span className="ops-alert-body">
                            {compact ? (
                              <span className="ops-alert-line">
                                {landName ? (
                                  <span className="ops-alert-land">{landName}</span>
                                ) : null}
                                <strong className="ops-alert-step">{stepTitle}</strong>
                                {due ? (
                                  <span className="ops-alert-due">{due}</span>
                                ) : null}
                              </span>
                            ) : (
                              <>
                                {landName ? (
                                  <span className="ops-alert-land">{landName}</span>
                                ) : null}
                                <strong className="ops-alert-step">{stepTitle}</strong>
                                <span className="ops-alert-meta">
                                  Bilgi bekleniyor
                                  {due ? (
                                    <>
                                      <span aria-hidden> · </span>
                                      <span className="ops-alert-due">Son tarih {due}</span>
                                    </>
                                  ) : null}
                                </span>
                              </>
                            )}
                          </span>
                          {landId ? (
                            <ChevronRight className="ops-alert-chevron" aria-hidden />
                          ) : null}
                        </>
                      )
                      return (
                        <li key={a.id}>
                          {landId ? (
                            <Link
                              to={`/app/lands/${landId}`}
                              className={`ops-alert-row${compact ? ' is-compact' : ''}`}
                            >
                              {body}
                            </Link>
                          ) : (
                            <div
                              className={`ops-alert-row ops-alert-row-static${compact ? ' is-compact' : ''}`}
                            >
                              {body}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  {allAlerts.length > ALERT_PREVIEW_COUNT ? (
                    <div className="ops-alerts-toggle-wrap">
                      <button
                        type="button"
                        className="ops-alerts-toggle"
                        onClick={() => setAlertsExpanded((v) => !v)}
                        aria-expanded={alertsExpanded}
                      >
                        {alertsExpanded ? (
                          <>
                            Daralt
                            <ChevronUp size={15} aria-hidden />
                          </>
                        ) : (
                          <>
                            Tüm uyarıları göster ({allAlerts.length})
                            <ChevronDown size={15} aria-hidden />
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            <aside className="ops-people">
              <Link to="/app/approvals" className="ops-nav-card">
                <div className="ops-nav-card-text">
                  <strong>Onaylar</strong>
                  <span>
                    {pendingCount > 0
                      ? `${pendingCount} bekleyen onay`
                      : 'Kanıt onay kuyruğu'}
                  </span>
                </div>
                <ChevronRight className="ops-nav-card-chevron" aria-hidden />
              </Link>

              <Link to="/app/producers" className="ops-nav-card">
                <div className="ops-nav-card-text">
                  <strong>{admin ? 'Üreticiler' : 'Atanan üreticiler'}</strong>
                  <span>
                    {data.producers > 0
                      ? `${data.producers} üretici`
                      : admin
                        ? 'Listeye git'
                        : 'Atama bekleniyor'}
                  </span>
                </div>
                <ChevronRight className="ops-nav-card-chevron" aria-hidden />
              </Link>

              {admin && (
                <Link to="/app/officers" className="ops-nav-card">
                  <div className="ops-nav-card-text">
                    <strong>Uzmanlar</strong>
                    <span>Listeye git</span>
                  </div>
                  <ChevronRight className="ops-nav-card-chevron" aria-hidden />
                </Link>
              )}
            </aside>
          </div>

          <section className="ops-shortcuts">
            <h3>Hızlı erişim</h3>
            <div className="ops-shortcut-grid">
              <Link to="/app/lands" className="ops-shortcut">
                <span className="ops-shortcut-icon" aria-hidden>
                  <Map className="size-4" />
                </span>
                <strong>{admin ? 'Araziler' : 'Arazilerim'}</strong>
                <span>{admin ? 'Liste ve detay' : 'Atanan araziler'}</span>
              </Link>
              <Link to="/app/messages" className="ops-shortcut">
                <span className="ops-shortcut-icon" aria-hidden>
                  <MessageSquare className="size-4" />
                </span>
                <strong>Mesajlar</strong>
                <span>{admin ? 'Personel sohbeti' : 'Yöneticiye yaz'}</span>
              </Link>
              <Link to="/app/approvals" className="ops-shortcut">
                <span className="ops-shortcut-icon" aria-hidden>
                  <CheckCircle2 className="size-4" />
                </span>
                <strong>Onaylar</strong>
                <span>
                  {pendingCount > 0 ? `${pendingCount} bekleyen` : 'Onay kuyruğu'}
                </span>
              </Link>
              <Link to="/app#uyarilar" className="ops-shortcut">
                <span className="ops-shortcut-icon ops-shortcut-icon-warn" aria-hidden>
                  <AlertTriangle className="size-4" />
                </span>
                <strong>Geciken uyarılar</strong>
                <span>Acil listeye git</span>
              </Link>
              <Link to="/app/workflows" className="ops-shortcut">
                <span className="ops-shortcut-icon" aria-hidden>
                  <Workflow className="size-4" />
                </span>
                <strong>İş akışları</strong>
                <span>{admin ? 'Şablonlar' : 'Şablon ekle / ata'}</span>
              </Link>
              {admin ? (
                <Link to="/app/lands#yeni" className="ops-shortcut">
                  <span className="ops-shortcut-icon" aria-hidden>
                    <Plus className="size-4" />
                  </span>
                  <strong>Yeni arazi</strong>
                  <span>Kayıt formu</span>
                </Link>
              ) : (
                <Link to="/app/inspections" className="ops-shortcut">
                  <span className="ops-shortcut-icon" aria-hidden>
                    <ShieldCheck className="size-4" />
                  </span>
                  <strong>Denetimler</strong>
                  <span>Saha kayıtları</span>
                </Link>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  )
}
