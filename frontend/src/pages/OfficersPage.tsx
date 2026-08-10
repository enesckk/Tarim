import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminOnlyNotice } from '../components/AdminOnlyNotice'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Filter,
  Mail,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import type { Land, StaffUser } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/roles'
import {
  neighborhoodSelectOptions,
} from '../constants/sehitkamilNeighborhoods'
import { matchesSearch } from '../utils/search'
import '../layout/layout.css'

const PAGE_SIZE = 6

type SortKey = 'name-asc' | 'name-desc' | 'lands-desc' | 'inspections-desc'
type StatusFilter = 'all' | 'active' | 'passive'

type DraftFilters = {
  status: StatusFilter
  neighborhood: string | null
}

const EMPTY_FILTERS: DraftFilters = {
  status: 'all',
  neighborhood: null,
}

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'name-asc', label: 'Ada göre (A-Z)' },
  { id: 'name-desc', label: 'Ada göre (Z-A)' },
  { id: 'lands-desc', label: 'Sorumlu arazi (çok → az)' },
  { id: 'inspections-desc', label: 'Bugünkü denetim (çok → az)' },
]

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirm: '',
  specialization: '',
  neighborhood: '',
  isActive: true,
}

function validateOfficerCreateForm(form: typeof emptyForm): string | null {
  if (!form.firstName.trim()) return 'Ad zorunludur.'
  if (!form.lastName.trim()) return 'Soyad zorunludur.'
  if (!form.email.trim()) return 'E-posta zorunludur.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Geçerli bir e-posta girin.'
  const password = form.password.trim()
  if (!password) return 'Uygulama şifresi zorunludur.'
  if (password.length < 8) return 'Uygulama şifresi en az 8 karakter olmalıdır.'
  if (password !== form.passwordConfirm.trim()) return 'Şifreler eşleşmiyor.'
  return null
}

function unwrapId(value: unknown): string {
  if (typeof value === 'string') return value.replace(/^"|"$/g, '')
  if (value && typeof value === 'object' && 'id' in value) {
    return String((value as { id: string }).id)
  }
  return String(value ?? '')
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function formatNeighborhood(value?: string | null): string {
  const raw = (value ?? '').trim()
  if (!raw) return '—'
  if (/mahallesi$/i.test(raw)) return raw
  return `${raw} Mahallesi`
}

function isOfficerActive(o: StaffUser): boolean {
  if (typeof o.isActive === 'boolean') return o.isActive
  return (o.status ?? 'Active') !== 'Passive'
}

function applyFilters(items: StaffUser[], search: string, filters: DraftFilters): StaffUser[] {
  return items.filter((item) => {
    if (!matchesSearch(search, item.fullName, item.email, item.phoneNumber, item.specialization)) {
      return false
    }
    if (filters.status === 'active' && !isOfficerActive(item)) return false
    if (filters.status === 'passive' && isOfficerActive(item)) return false
    if (filters.neighborhood) {
      const nh = (item.neighborhood ?? '').trim()
      if (nh !== filters.neighborhood) return false
    }
    return true
  })
}

function sortOfficers(items: StaffUser[], sort: SortKey): StaffUser[] {
  const copy = [...items]
  copy.sort((a, b) => {
    switch (sort) {
      case 'name-desc':
        return b.fullName.localeCompare(a.fullName, 'tr')
      case 'lands-desc': {
        const diff = (b.responsibleLandCount ?? 0) - (a.responsibleLandCount ?? 0)
        return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName, 'tr')
      }
      case 'inspections-desc': {
        const diff = (b.todaysInspectionCount ?? 0) - (a.todaysInspectionCount ?? 0)
        return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName, 'tr')
      }
      case 'name-asc':
      default:
        return a.fullName.localeCompare(b.fullName, 'tr')
    }
  })
  return copy
}

function formatPhone(phone?: string | null): string {
  const raw = (phone ?? '').trim()
  if (!raw) return '—'
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
  }
  if (digits.length === 10) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
  }
  return raw
}

function telHref(phone?: string | null): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  return `tel:${digits}`
}

export function OfficersPage() {
  const { officerId } = useParams()
  const { user } = useAuth()
  const admin = isAdmin(user?.roles)
  if (!admin) return <AdminOnlyNotice title="Uzman listesi ve yönetimi yalnızca yöneticiler içindir." />
  if (officerId) return <OfficerDetailPage officerId={officerId} />
  return <OfficersListPage />
}

function OfficersListPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState<SortKey>('name-asc')
  const [sortOpen, setSortOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<DraftFilters>(EMPTY_FILTERS)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)

  useEffect(() => {
    function onDocClick() {
      setSortOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const { data: items = [], error, isLoading } = useQuery({
    queryKey: ['staff-officers'],
    queryFn: () => api<StaffUser[]>('/api/staff/officers', {}, token),
    enabled: Boolean(token),
  })

  const filteredItems = useMemo(
    () => sortOfficers(applyFilters(items, search, appliedFilters), sort),
    [items, search, appliedFilters, sort],
  )

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    if (page !== safePage) {
      const next = new URLSearchParams(searchParams)
      if (safePage <= 1) next.delete('page')
      else next.set('page', String(safePage))
      setSearchParams(next, { replace: true })
    }
  }, [page, safePage, searchParams, setSearchParams])

  const summary = useMemo(() => {
    const total = items.length
    const active = items.filter(isOfficerActive).length
    const lands = items.reduce((sum, o) => sum + (o.responsibleLandCount ?? 0), 0)
    const inspections = items.reduce((sum, o) => sum + (o.todaysInspectionCount ?? 0), 0)
    return { total, active, lands, inspections }
  }, [items])

  const neighborhoodOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      const key = (item.neighborhood ?? '').trim()
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'tr'))
      .map(([name, count]) => ({ name, count }))
  }, [items])

  const create = useMutation({
    mutationFn: async () => {
      const validationError = validateOfficerCreateForm(form)
      if (validationError) throw new Error(validationError)

      const raw = await api<string>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password.trim(),
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            role: 'Officer',
            phone: form.phone.trim() || null,
            specialization: form.specialization.trim() || null,
            neighborhood: form.neighborhood.trim() || null,
            isActive: form.isActive,
          }),
        },
        token,
      )
      return unwrapId(raw)
    },
    onSuccess: async (id) => {
      setForm(emptyForm)
      setFormError(null)
      setShowForm(false)
      await queryClient.invalidateQueries({ queryKey: ['staff-officers'] })
      await queryClient.invalidateQueries({ queryKey: ['officers'] })
      if (id) navigate(`/app/officers/${id}`)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const validationError = validateOfficerCreateForm(form)
    if (validationError) {
      setFormError(validationError)
      return
    }
    setFormError(null)
    create.mutate()
  }

  function setPage(next: number) {
    const clamped = Math.max(1, Math.min(totalPages, next))
    const params = new URLSearchParams(searchParams)
    if (clamped <= 1) params.delete('page')
    else params.set('page', String(clamped))
    setSearchParams(params)
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? 'Ada göre (A-Z)'
  const activeFilterCount =
    (appliedFilters.status !== 'all' ? 1 : 0) + (appliedFilters.neighborhood ? 1 : 0)

  return (
    <section className="officers-page">
      <div className="officers-page-header">
        <div>
          <h1>Uzmanlar</h1>
          <p>Tarım uzmanlarınızı yönetin ve iletişim bilgilerine erişin.</p>
        </div>
        <button
          type="button"
          className="primary-btn officers-new-btn"
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
          }}
        >
          {showForm ? (
            'Formu kapat'
          ) : (
            <>
              <Plus size={16} aria-hidden />
              Yeni uzman
            </>
          )}
        </button>
      </div>

      <div className="officers-create-panel" id="yeni-uzman" hidden={!showForm}>
        {showForm ? (
          <form className="form-grid two-col" onSubmit={onSubmit}>
            <label>
              Ad <span className="required-mark">*</span>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </label>
            <label>
              Soyad <span className="required-mark">*</span>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </label>
            <label>
              E-posta <span className="required-mark">*</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="uzman@ornek.local"
              />
            </label>
            <label>
              Telefon
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0555 111 22 00"
                inputMode="tel"
              />
            </label>
            <label>
              Uygulama şifresi <span className="required-mark">*</span>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="En az 8 karakter"
              />
            </label>
            <label>
              Şifre tekrar <span className="required-mark">*</span>
              <input
                type="text"
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Şifreyi tekrar girin"
              />
            </label>
            <p
              className="muted"
              style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13 }}
            >
              E-posta (veya telefon) + şifre ile panel/uygulama girişi oluşturulur. Bu bilgileri
              uzmana iletebilirsiniz.
            </p>
            <label>
              Uzmanlık
              <input
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                placeholder="Örn. Bitki Koruma Uzmanı"
              />
            </label>
            <label>
              Mahalle
              <select
                value={form.neighborhood}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              >
                <option value="">Mahalle seçin</option>
                {neighborhoodSelectOptions(form.neighborhood).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="officers-check-label">
              <span>Durum</span>
              <label className="officers-inline-check">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Aktif uzman
              </label>
            </label>
            <div style={{ gridColumn: '1 / -1' }}>
              <button className="primary-btn" type="submit" disabled={create.isPending}>
                {create.isPending ? 'Kaydediliyor…' : 'Uzmanı kaydet'}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {(formError || error || create.error) && (
        <p className="error empty">
          {formError ?? ((create.error ?? error) as Error).message}
        </p>
      )}

      <div className="officers-summary">
        <article className="officers-summary-card">
          <div>
            <span>Toplam uzman</span>
            <strong>{summary.total}</strong>
            <small>Tüm zamanlar</small>
          </div>
          <span className="officers-summary-icon" aria-hidden>
            <Users size={18} />
          </span>
        </article>
        <article className="officers-summary-card">
          <div>
            <span>Aktif uzman</span>
            <strong>{summary.active}</strong>
            <small>Görevde olanlar</small>
          </div>
          <span className="officers-summary-icon" aria-hidden>
            <UserRound size={18} />
          </span>
        </article>
        <article className="officers-summary-card">
          <div>
            <span>Toplam sorumlu arazi</span>
            <strong>{summary.lands}</strong>
            <small>Tüm uzmanlara ait</small>
          </div>
          <span className="officers-summary-icon" aria-hidden>
            <MapIcon size={18} />
          </span>
        </article>
        <article className="officers-summary-card">
          <div>
            <span>Bugünkü denetimler</span>
            <strong>{summary.inspections}</strong>
            <small>Uzmanlar tarafından</small>
          </div>
          <span className="officers-summary-icon" aria-hidden>
            <ClipboardCheck size={18} />
          </span>
        </article>
      </div>

      <div className="officers-toolbar">
        <div className="officers-search">
          <Search className="officers-search-icon" size={16} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Uzman adı, e-posta veya telefon ara..."
            aria-label="Uzman adı, e-posta veya telefon ara"
          />
          {search ? (
            <button
              type="button"
              className="officers-search-clear"
              onClick={() => setSearch('')}
              aria-label="Aramayı temizle"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className={`officers-toolbar-btn${showFilters ? ' is-active' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter size={16} aria-hidden />
          Filtrele
          {activeFilterCount > 0 ? <em>{activeFilterCount}</em> : null}
        </button>

        <div className="officers-sort">
          <button
            type="button"
            className="officers-toolbar-btn officers-sort-btn"
            aria-expanded={sortOpen}
            onClick={(e) => {
              e.stopPropagation()
              setSortOpen((v) => !v)
            }}
          >
            <span>Sırala: {sortLabel}</span>
            <ChevronDown size={15} aria-hidden />
          </button>
          {sortOpen ? (
            <div className="officers-sort-menu" role="listbox" onClick={(e) => e.stopPropagation()}>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={sort === opt.id}
                  className={sort === opt.id ? 'is-active' : undefined}
                  onClick={() => {
                    setSort(opt.id)
                    setSortOpen(false)
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {showFilters ? (
        <aside className="officers-filters" aria-label="Filtreler">
          <div className="officers-filters-head">
            <h2>Filtreler</h2>
            <button
              type="button"
              className="officers-filters-close"
              onClick={() => setShowFilters(false)}
              aria-label="Filtreleri kapat"
            >
              <X size={16} />
            </button>
          </div>

          <div className="officers-filter-section">
            <h3>Durum</h3>
            <div className="officers-filter-chips">
              {(
                [
                  { id: 'all', label: 'Tümü' },
                  { id: 'active', label: 'Aktif' },
                  { id: 'passive', label: 'Pasif' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={draftFilters.status === opt.id ? 'is-active' : undefined}
                  onClick={() => setDraftFilters((prev) => ({ ...prev, status: opt.id }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="officers-filter-section">
            <h3>Mahalle</h3>
            <div className="officers-filter-list" role="radiogroup" aria-label="Mahalle">
              <label
                className={`officers-filter-option${draftFilters.neighborhood === null ? ' is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="officers-neighborhood"
                  checked={draftFilters.neighborhood === null}
                  onChange={() => setDraftFilters((prev) => ({ ...prev, neighborhood: null }))}
                />
                <span>Tümü</span>
                <em>{items.length}</em>
              </label>
              {neighborhoodOptions.map((opt) => (
                <label
                  key={opt.name}
                  className={`officers-filter-option${draftFilters.neighborhood === opt.name ? ' is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="officers-neighborhood"
                    checked={draftFilters.neighborhood === opt.name}
                    onChange={() =>
                      setDraftFilters((prev) => ({ ...prev, neighborhood: opt.name }))
                    }
                  />
                  <span>{opt.name}</span>
                  <em>{opt.count}</em>
                </label>
              ))}
            </div>
          </div>

          <div className="officers-filters-footer">
            <button
              type="button"
              className="officers-clear-btn"
              onClick={() => {
                setDraftFilters(EMPTY_FILTERS)
                setAppliedFilters(EMPTY_FILTERS)
              }}
            >
              Temizle
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setAppliedFilters(draftFilters)
                setShowFilters(false)
                setPage(1)
              }}
            >
              Uygula
            </button>
          </div>
        </aside>
      ) : null}

      {isLoading ? (
        <p className="empty officers-empty">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="empty officers-empty">Kayıtlı tarım uzmanı yok.</p>
      ) : filteredItems.length === 0 ? (
        <p className="empty officers-empty">Aramanızla eşleşen uzman bulunamadı.</p>
      ) : (
        <>
          <div className="officers-table-wrap" role="region" aria-label="Uzmanlar listesi">
            <table className="officers-table">
              <colgroup>
                <col style={{ width: 220 }} />
                <col style={{ width: 180 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 220 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 310 }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Uzman</th>
                  <th scope="col">Mahalle</th>
                  <th scope="col">Sorumlu arazi</th>
                  <th scope="col">Bugünkü denetim</th>
                  <th scope="col">İletişim</th>
                  <th scope="col">Durum</th>
                  <th scope="col">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const active = isOfficerActive(item)
                  const phoneLink = telHref(item.phoneNumber)

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="officers-table-identity">
                          <span className="officers-avatar" aria-hidden>
                            {initials(item.fullName)}
                          </span>
                          <div className="officers-table-identity-text">
                            <span className="cell-ellipsis officers-table-primary">{item.fullName}</span>
                            <span className="cell-ellipsis officers-table-secondary">
                              {item.specialization?.trim() || 'Tarım Uzmanı'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="officers-table-inline">
                          <MapPin size={14} aria-hidden />
                          <span className="cell-ellipsis">{formatNeighborhood(item.neighborhood)}</span>
                        </span>
                      </td>
                      <td>
                        <span className="officers-table-strong">{item.responsibleLandCount ?? 0}</span>
                      </td>
                      <td>
                        <span className="officers-table-strong">{item.todaysInspectionCount ?? 0}</span>
                      </td>
                      <td>
                        <div className="officers-table-stack">
                          <span className="officers-table-inline">
                            <Phone size={14} aria-hidden />
                            <span className="cell-ellipsis">{formatPhone(item.phoneNumber)}</span>
                          </span>
                          <span className="officers-table-inline">
                            <Mail size={14} aria-hidden />
                            <span className="cell-ellipsis">{item.email?.trim() || '—'}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`officers-status officers-table-status ${
                            active ? 'is-active' : 'is-passive'
                          }`}
                        >
                          {active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td>
                        <div className="officers-table-actions">
                          {phoneLink ? (
                            <a href={phoneLink} className="officers-action-btn">
                              <Phone size={14} aria-hidden />
                              Telefon et
                            </a>
                          ) : (
                            <span className="officers-action-btn is-disabled">
                              <Phone size={14} aria-hidden />
                              Telefon et
                            </span>
                          )}
                          <Link to={`/app/messages?officerId=${item.id}`} className="officers-action-btn">
                            <MessageSquare size={14} aria-hidden />
                            Mesaj gönder
                          </Link>
                          <Link to={`/app/officers/${item.id}`} className="officers-action-btn">
                            Detayları görüntüle
                            <ChevronRight size={14} aria-hidden />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="officers-pagination">
            <div className="officers-pagination-pages">
              <button
                type="button"
                className="officers-page-btn"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                aria-label="Önceki sayfa"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`officers-page-btn${n === safePage ? ' is-active' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="officers-page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                aria-label="Sonraki sayfa"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="officers-page-size">Sayfa başına: {PAGE_SIZE}</div>
          </div>
        </>
      )}
    </section>
  )
}

function OfficerDetailPage({ officerId }: { officerId: string }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [edit, setEdit] = useState({
    specialization: '',
    neighborhood: '',
    phoneNumber: '',
    isActive: true,
  })

  const officerQuery = useQuery({
    queryKey: ['staff-officer', officerId],
    queryFn: () => api<StaffUser>(`/api/staff/officers/${officerId}`, {}, token),
    enabled: Boolean(token && officerId),
  })

  const landsQuery = useQuery({
    queryKey: ['lands', 'officer', officerId],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token && officerId),
  })

  const officer = officerQuery.data
  const lands = useMemo(
    () => (landsQuery.data ?? []).filter((l) => l.assignedOfficerUserId === officerId),
    [landsQuery.data, officerId],
  )

  useEffect(() => {
    if (!officer) return
    setEdit({
      specialization: officer.specialization ?? '',
      neighborhood: officer.neighborhood ?? '',
      phoneNumber: officer.phoneNumber ?? '',
      isActive: isOfficerActive(officer),
    })
  }, [officer])

  const update = useMutation({
    mutationFn: () =>
      api(
        `/api/staff/officers/${officerId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            phoneNumber: edit.phoneNumber.trim() || null,
            specialization: edit.specialization.trim() || null,
            neighborhood: edit.neighborhood.trim() || null,
            isActive: edit.isActive,
          }),
        },
        token,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-officer', officerId] })
      await queryClient.invalidateQueries({ queryKey: ['staff-officers'] })
      await queryClient.invalidateQueries({ queryKey: ['officers'] })
    },
  })

  if (officerQuery.isLoading) {
    return (
      <section className="officers-page">
        <p className="empty officers-empty">Yükleniyor…</p>
      </section>
    )
  }

  if (officerQuery.error || !officer) {
    return (
      <section className="officers-page">
        <p className="error empty">
          {(officerQuery.error as Error)?.message ?? 'Uzman bulunamadı.'}
        </p>
        <button type="button" className="ghost-btn" onClick={() => navigate('/app/officers')}>
          <ChevronLeft size={16} /> Uzmanlara dön
        </button>
      </section>
    )
  }

  const phoneLink = telHref(officer.phoneNumber)
  const active = isOfficerActive(officer)

  return (
    <section className="officers-page">
      <div className="officers-page-header">
        <div>
          <button type="button" className="ghost-btn officers-back" onClick={() => navigate('/app/officers')}>
            <ChevronLeft size={16} /> Uzmanlar
          </button>
          <h1>{officer.fullName}</h1>
          <p>{officer.specialization?.trim() || 'Tarım Uzmanı'}</p>
        </div>
        <span className={`officers-status ${active ? 'is-active' : 'is-passive'}`}>
          {active ? 'Aktif' : 'Pasif'}
        </span>
      </div>

      <div className="officers-detail-grid">
        <article className="officers-detail-card">
          <h2>Profil</h2>
          <div className="officers-detail-identity">
            <span className="officers-avatar officers-avatar-lg" aria-hidden>
              {initials(officer.fullName)}
            </span>
            <div>
              <strong>{officer.fullName}</strong>
              <p>{formatNeighborhood(officer.neighborhood)}</p>
            </div>
          </div>
          <dl className="officers-detail-dl">
            <div>
              <dt>E-posta</dt>
              <dd>{officer.email ?? '—'}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>{formatPhone(officer.phoneNumber)}</dd>
            </div>
            <div>
              <dt>Sorumlu arazi</dt>
              <dd>{officer.responsibleLandCount ?? lands.length}</dd>
            </div>
            <div>
              <dt>Bugünkü denetim</dt>
              <dd>{officer.todaysInspectionCount ?? 0}</dd>
            </div>
          </dl>
          <div className="officers-card-actions" style={{ marginTop: 16 }}>
            {phoneLink ? (
              <a href={phoneLink} className="officers-action-btn">
                <Phone size={14} /> Telefon et
              </a>
            ) : null}
            <Link to={`/app/messages?officerId=${officer.id}`} className="officers-action-btn">
              <MessageSquare size={14} /> Mesaj gönder
            </Link>
          </div>
        </article>

        <article className="officers-detail-card">
          <h2>Düzenle</h2>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault()
              update.mutate()
            }}
          >
            <label>
              Uzmanlık
              <input
                value={edit.specialization}
                onChange={(e) => setEdit({ ...edit, specialization: e.target.value })}
              />
            </label>
            <label>
              Mahalle
              <select
                value={edit.neighborhood}
                onChange={(e) => setEdit({ ...edit, neighborhood: e.target.value })}
              >
                <option value="">Mahalle seçin</option>
                {neighborhoodSelectOptions(edit.neighborhood).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Telefon
              <input
                value={edit.phoneNumber}
                onChange={(e) => setEdit({ ...edit, phoneNumber: e.target.value })}
                inputMode="tel"
              />
            </label>
            <label className="officers-inline-check">
              <input
                type="checkbox"
                checked={edit.isActive}
                onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })}
              />
              Aktif uzman
            </label>
            {update.error && <p className="error">{(update.error as Error).message}</p>}
            <button className="primary-btn" type="submit" disabled={update.isPending}>
              {update.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </form>
        </article>
      </div>

      <article className="officers-detail-card">
        <h2>Sorumlu araziler ({lands.length})</h2>
        {landsQuery.isLoading ? (
          <p className="empty">Yükleniyor…</p>
        ) : lands.length === 0 ? (
          <p className="empty">Bu uzmana atanmış arazi yok.</p>
        ) : (
          <ul className="officers-land-list">
            {lands.map((land) => (
              <li key={land.id}>
                <Link to={`/app/lands/${land.id}`}>
                  <strong>{land.name}</strong>
                  <span>
                    {formatNeighborhood(land.neighborhood)} · Parsel {land.parcelNumber}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}
