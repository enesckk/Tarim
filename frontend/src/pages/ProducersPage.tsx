import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  IdCard,
  Mail,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  PauseCircle,
  Phone,
  Plus,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import type { Land, Producer, ProducerNote } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/roles'
import { matchesSearch } from '../utils/search'
import '../layout/layout.css'

const PAGE_SIZE = 6

type SortKey = 'name-asc' | 'name-desc' | 'lands-desc' | 'area-desc'
type StatusFilter = 'all' | 'active' | 'passive'
type LandsFilter = 'all' | 'with' | 'without'

type DraftFilters = {
  status: StatusFilter
  lands: LandsFilter
  neighborhood: string | null
}

type ProducerLandStats = {
  count: number
  totalDecares: number
  neighborhood: string | null
  primaryLandId: string | null
}

const EMPTY_FILTERS: DraftFilters = {
  status: 'all',
  lands: 'all',
  neighborhood: null,
}

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'name-asc', label: 'Ada göre (A-Z)' },
  { id: 'name-desc', label: 'Ada göre (Z-A)' },
  { id: 'lands-desc', label: 'Bağlı arazi (çok → az)' },
]

const emptyForm = {
  firstName: '',
  lastName: '',
  nationalId: '',
  phone: '',
  password: '',
  email: '',
  address: '',
  landId: '',
  createNewLand: false,
  landName: '',
  landParcel: '',
  landSize: '1',
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

function formatSize(value: number): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
  return `${rounded} da`
}

function maskNationalId(value?: string | null): string {
  const raw = (value ?? '').trim()
  if (!raw) return '—'
  if (raw.length < 5) return raw
  return `${raw.slice(0, 3)}*****${raw.slice(-3)}`
}

function buildLandStatsByProducer(lands: Land[]): Map<string, ProducerLandStats> {
  const map = new Map<string, ProducerLandStats>()
  for (const land of lands) {
    const producerId = land.producerId?.trim()
    if (!producerId) continue
    const current = map.get(producerId) ?? {
      count: 0,
      totalDecares: 0,
      neighborhood: null,
      primaryLandId: null,
    }
    const neighborhood = (land.neighborhood ?? '').trim() || null
    map.set(producerId, {
      count: current.count + 1,
      totalDecares: current.totalDecares + (land.sizeInDecares || 0),
      neighborhood: current.neighborhood ?? neighborhood,
      primaryLandId: current.primaryLandId ?? land.id,
    })
  }
  return map
}

function producerNeighborhood(
  producer: Producer,
  stats?: ProducerLandStats,
): string | null {
  const fromLand = stats?.neighborhood?.trim()
  if (fromLand) return fromLand
  const fromAddress = (producer.address ?? '').trim()
  return fromAddress || null
}

function applyFilters(
  items: Producer[],
  search: string,
  filters: DraftFilters,
  statsByProducer: Map<string, ProducerLandStats>,
): Producer[] {
  return items.filter((item) => {
    const stats = statsByProducer.get(item.id)
    const neighborhood = producerNeighborhood(item, stats)
    if (
      !matchesSearch(
        search,
        item.fullName,
        item.firstName,
        item.lastName,
        item.phone,
        item.email,
        item.nationalId,
        item.address,
        neighborhood,
      )
    ) {
      return false
    }
    if (filters.status === 'active' && !item.isActive) return false
    if (filters.status === 'passive' && item.isActive) return false
    const landCount = stats?.count ?? 0
    if (filters.lands === 'with' && landCount === 0) return false
    if (filters.lands === 'without' && landCount > 0) return false
    if (filters.neighborhood) {
      if ((neighborhood ?? '').trim() !== filters.neighborhood) return false
    }
    return true
  })
}

function sortProducers(
  items: Producer[],
  sort: SortKey,
  statsByProducer: Map<string, ProducerLandStats>,
): Producer[] {
  const copy = [...items]
  copy.sort((a, b) => {
    switch (sort) {
      case 'name-desc':
        return b.fullName.localeCompare(a.fullName, 'tr')
      case 'lands-desc': {
        const diff = (statsByProducer.get(b.id)?.count ?? 0) - (statsByProducer.get(a.id)?.count ?? 0)
        return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName, 'tr')
      }
      case 'area-desc': {
        const diff =
          (statsByProducer.get(b.id)?.totalDecares ?? 0) -
          (statsByProducer.get(a.id)?.totalDecares ?? 0)
        return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName, 'tr')
      }
      case 'name-asc':
      default:
        return a.fullName.localeCompare(b.fullName, 'tr')
    }
  })
  return copy
}

export function ProducersPage() {
  const { producerId } = useParams()
  if (producerId) return <ProducerDetailPage producerId={producerId} />
  return <ProducersListPage />
}

function ProducersListPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const admin = isAdmin(user?.roles)
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState<SortKey>('name-asc')
  const [sortOpen, setSortOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<DraftFilters>(EMPTY_FILTERS)
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)

  useEffect(() => {
    function onDocClick() {
      setSortOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const { data: items = [], error, isLoading } = useQuery({
    queryKey: ['producers'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token),
  })

  const { data: lands = [] } = useQuery({
    queryKey: ['lands'],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token),
  })

  const statsByProducer = useMemo(() => buildLandStatsByProducer(lands), [lands])

  const assignableLands = useMemo(
    () =>
      [...lands].sort((a, b) => {
        const aFree = a.producerId ? 1 : 0
        const bFree = b.producerId ? 1 : 0
        if (aFree !== bFree) return aFree - bFree
        return a.name.localeCompare(b.name, 'tr')
      }),
    [lands],
  )

  const filteredItems = useMemo(
    () => sortProducers(applyFilters(items, search, appliedFilters, statsByProducer), sort, statsByProducer),
    [items, search, appliedFilters, sort, statsByProducer],
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
    const active = items.filter((p) => p.isActive).length
    const passive = total - active
    const linkedLands = lands.filter((l) => Boolean(l.producerId)).length
    return { total, active, passive, linkedLands }
  }, [items, lands])

  const neighborhoodOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      const key = (producerNeighborhood(item, statsByProducer.get(item.id)) ?? '').trim()
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'tr'))
      .map(([name, count]) => ({ name, count }))
  }, [items, statsByProducer])

  const create = useMutation({
    mutationFn: async () => {
      if (form.createNewLand) {
        if (!form.landName.trim() || !form.landParcel.trim()) {
          throw new Error('Yeni arazi için ad ve parsel zorunlu.')
        }
        const size = Number(form.landSize)
        if (!size || size <= 0) {
          throw new Error('Yeni arazi için geçerli dekar girin.')
        }
      }

      const producerIdRaw = await api<string>(
        '/api/producers',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            nationalId: form.nationalId.trim(),
            phone: form.phone.trim(),
            password: form.password,
            email: form.email.trim() || null,
            address: form.address.trim() || null,
          }),
        },
        token,
      )
      const producerId = unwrapId(producerIdRaw)

      if (form.createNewLand) {
        await api(
          '/api/lands',
          {
            method: 'POST',
            body: JSON.stringify({
              name: form.landName.trim(),
              parcelNumber: form.landParcel.trim(),
              sizeInDecares: Number(form.landSize),
              neighborhood: null,
              soilType: null,
              soilNotes: null,
              cadastralBlock: null,
              latitude: null,
              longitude: null,
              city: null,
              district: null,
              producerId,
            }),
          },
          token,
        )
      } else if (form.landId) {
        await api(
          `/api/lands/${form.landId}/assign-producer`,
          {
            method: 'POST',
            body: JSON.stringify({ producerId }),
          },
          token,
        )
      }

      return producerId
    },
    onSuccess: async (producerId) => {
      setForm(emptyForm)
      setShowForm(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['producers'] }),
        queryClient.invalidateQueries({ queryKey: ['lands'] }),
        queryClient.invalidateQueries({ queryKey: ['operations-center'] }),
      ])
      if (producerId) navigate(`/producers/${producerId}`)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
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
    (appliedFilters.status !== 'all' ? 1 : 0) +
    (appliedFilters.lands !== 'all' ? 1 : 0) +
    (appliedFilters.neighborhood ? 1 : 0)

  return (
    <section className="officers-page producers-page">
      <div className="officers-page-header">
        <div>
          <h1>Üreticiler</h1>
          <p>
            {admin
              ? 'Üreticileri yönetin, iletişim bilgilerine ve bağlı arazilere erişin.'
              : 'Atandığınız arazilere bağlı üreticiler.'}
          </p>
        </div>
        {admin ? (
          <button
            type="button"
            className="primary-btn officers-new-btn"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? (
              'Formu kapat'
            ) : (
              <>
                <Plus size={16} aria-hidden />
                Yeni üretici
              </>
            )}
          </button>
        ) : null}
      </div>

      <div className="officers-create-panel" id="yeni-uretici" hidden={!showForm}>
        {showForm && admin ? (
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
              T.C. Kimlik No <span className="required-mark">*</span>
              <input
                value={form.nationalId}
                onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                required
                maxLength={11}
              />
            </label>
            <label>
              Telefon <span className="required-mark">*</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                placeholder="Örn. 5537472823"
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
                minLength={3}
                placeholder="Mobil giriş şifresi"
                autoComplete="new-password"
              />
            </label>
            <p className="muted" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13 }}>
              Telefon + şifre, üreticinin mobil uygulamaya girişi için kullanılır.
            </p>
            <label>
              E-posta
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Adres
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>

            <div
              style={{
                gridColumn: '1 / -1',
                borderTop: '1px solid var(--border)',
                paddingTop: 14,
                marginTop: 4,
                display: 'grid',
                gap: 12,
              }}
            >
              <strong style={{ fontSize: 14 }}>Arazi ataması (isteğe bağlı)</strong>
              <label className="checkbox-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={form.createNewLand}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      createNewLand: e.target.checked,
                      landId: e.target.checked ? '' : form.landId,
                    })
                  }
                />
                Yeni arazi oluştur ve bu üreticiye ata
              </label>

              {!form.createNewLand ? (
                <label>
                  Mevcut arazi
                  <select
                    value={form.landId}
                    onChange={(e) => setForm({ ...form, landId: e.target.value })}
                  >
                    <option value="">Atama yok</option>
                    {assignableLands.map((land) => (
                      <option key={land.id} value={land.id}>
                        {land.name}
                        {land.producerId ? ' (atanmış — yeniden atanır)' : ''}
                        {land.parcelNumber ? ` · ${land.parcelNumber}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="form-grid two-col" style={{ margin: 0 }}>
                  <label>
                    Arazi adı
                    <input
                      value={form.landName}
                      onChange={(e) => setForm({ ...form, landName: e.target.value })}
                      required={form.createNewLand}
                      placeholder="Örn. Değirmiçem Tarlası"
                    />
                  </label>
                  <label>
                    Parsel no
                    <input
                      value={form.landParcel}
                      onChange={(e) => setForm({ ...form, landParcel: e.target.value })}
                      required={form.createNewLand}
                      placeholder="Örn. P-120"
                    />
                  </label>
                  <label>
                    Alan (dekar)
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={form.landSize}
                      onChange={(e) => setForm({ ...form, landSize: e.target.value })}
                      required={form.createNewLand}
                    />
                  </label>
                </div>
              )}
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                İstersen boş bırak; üreticiyi sonra arazi detayından da atayabilirsin.
              </p>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <button className="primary-btn" type="submit" disabled={create.isPending}>
                {create.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {(error || create.error) && (
        <p className="error empty">{((create.error ?? error) as Error).message}</p>
      )}

      <div className="officers-summary">
        <article className="officers-summary-card">
          <div>
            <span>Toplam üretici</span>
            <strong>{summary.total}</strong>
            <small>Tüm kayıtlar</small>
          </div>
          <span className="officers-summary-icon" aria-hidden>
            <Users size={18} />
          </span>
        </article>
        <article className="officers-summary-card">
          <div>
            <span>Aktif üretici</span>
            <strong>{summary.active}</strong>
            <small>Sistemde aktif</small>
          </div>
          <span className="officers-summary-icon" aria-hidden>
            <UserCheck size={18} />
          </span>
        </article>
        <article className="officers-summary-card">
          <div>
            <span>Pasif üretici</span>
            <strong>{summary.passive}</strong>
            <small>Pasif durumda</small>
          </div>
          <span className="officers-summary-icon" aria-hidden>
            <PauseCircle size={18} />
          </span>
        </article>
        <article className="officers-summary-card">
          <div>
            <span>Bağlı arazi</span>
            <strong>{summary.linkedLands}</strong>
            <small>Üreticiye atanmış</small>
          </div>
          <span className="officers-summary-icon" aria-hidden>
            <MapIcon size={18} />
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
            placeholder="Ad, telefon, e-posta veya T.C. kimlik ara..."
            aria-label="Ad, telefon, e-posta veya T.C. kimlik ara"
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
            <h3>Arazi bağlantısı</h3>
            <div className="officers-filter-chips">
              {(
                [
                  { id: 'all', label: 'Tümü' },
                  { id: 'with', label: 'Arazisi var' },
                  { id: 'without', label: 'Arazisi yok' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={draftFilters.lands === opt.id ? 'is-active' : undefined}
                  onClick={() => setDraftFilters((prev) => ({ ...prev, lands: opt.id }))}
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
                  name="producers-neighborhood"
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
                    name="producers-neighborhood"
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
        <p className="empty officers-empty">Henüz üretici kaydı yok.</p>
      ) : filteredItems.length === 0 ? (
        <p className="empty officers-empty">Aramanızla eşleşen üretici bulunamadı.</p>
      ) : (
        <>
          <div className="officers-table-wrap" role="region" aria-label="Üreticiler listesi">
            <table className="officers-table">
              <colgroup>
                <col style={{ width: 250 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 240 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 310 }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Üretici</th>
                  <th scope="col">Mahalle</th>
                  <th scope="col">İletişim</th>
                  <th scope="col">Durum</th>
                  <th scope="col">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const stats = statsByProducer.get(item.id)
                  const landCount = stats?.count ?? 0
                  const neighborhood = producerNeighborhood(item, stats)
                  const phoneLink = telHref(item.phone)
                  const messageHref = stats?.primaryLandId
                    ? `/lands/${stats.primaryLandId}#sohbet`
                    : `/producers/${item.id}`

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="officers-table-identity">
                          <span className="officers-avatar" aria-hidden>
                            {initials(item.fullName)}
                          </span>
                          <div className="officers-table-identity-text">
                            <span className="cell-ellipsis officers-table-primary">{item.fullName}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="officers-table-inline">
                          <MapPin size={14} aria-hidden />
                          <span className="cell-ellipsis">{formatNeighborhood(neighborhood)}</span>
                        </span>
                      </td>
                      <td>
                        <div className="officers-table-stack">
                          <span className="officers-table-inline">
                            <Phone size={14} aria-hidden />
                            <span className="cell-ellipsis">{formatPhone(item.phone)}</span>
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
                            item.isActive ? 'is-active' : 'is-passive'
                          }`}
                        >
                          {item.isActive ? 'Aktif' : 'Pasif'}
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
                          <Link to={messageHref} className="officers-action-btn">
                            <MessageSquare size={14} aria-hidden />
                            Mesaj gönder
                          </Link>
                          <Link to={`/producers/${item.id}`} className="officers-action-btn">
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

function ProducerDetailPage({ producerId }: { producerId: string }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [noteBody, setNoteBody] = useState('')

  const producerQuery = useQuery({
    queryKey: ['producer', producerId],
    queryFn: () => api<Producer>(`/api/producers/${producerId}`, {}, token),
    enabled: Boolean(token && producerId),
  })

  const notesQuery = useQuery({
    queryKey: ['producer-notes', producerId],
    queryFn: () => api<ProducerNote[]>(`/api/producers/${producerId}/notes`, {}, token),
    enabled: Boolean(token && producerId),
  })

  const landsQuery = useQuery({
    queryKey: ['lands', 'producer', producerId],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token && producerId),
  })

  const addNote = useMutation({
    mutationFn: () =>
      api(
        `/api/producers/${producerId}/notes`,
        { method: 'POST', body: JSON.stringify({ body: noteBody }) },
        token,
      ),
    onSuccess: async () => {
      setNoteBody('')
      await queryClient.invalidateQueries({ queryKey: ['producer-notes', producerId] })
    },
  })

  const producer = producerQuery.data
  const notes = notesQuery.data ?? []
  const lands = useMemo(
    () => (landsQuery.data ?? []).filter((l) => l.producerId === producerId),
    [landsQuery.data, producerId],
  )
  const totalArea = useMemo(
    () => lands.reduce((sum, land) => sum + (land.sizeInDecares || 0), 0),
    [lands],
  )

  if (producerQuery.isLoading) {
    return (
      <section className="officers-page producers-page">
        <p className="empty officers-empty">Yükleniyor…</p>
      </section>
    )
  }

  if (producerQuery.error || !producer) {
    return (
      <section className="officers-page producers-page">
        <p className="error empty">
          {(producerQuery.error as Error)?.message ?? 'Üretici bulunamadı.'}
        </p>
        <button type="button" className="ghost-btn" onClick={() => navigate('/producers')}>
          <ChevronLeft size={16} /> Üreticilere dön
        </button>
      </section>
    )
  }

  const phoneLink = telHref(producer.phone)
  const messageHref = lands[0] ? `/lands/${lands[0].id}#sohbet` : undefined
  const neighborhood = producerNeighborhood(producer, {
    count: lands.length,
    totalDecares: totalArea,
    neighborhood: lands.find((l) => l.neighborhood?.trim())?.neighborhood ?? null,
    primaryLandId: lands[0]?.id ?? null,
  })

  return (
    <section className="officers-page producers-page">
      <div className="officers-page-header">
        <div>
          <button
            type="button"
            className="ghost-btn officers-back"
            onClick={() => navigate('/producers')}
          >
            <ChevronLeft size={16} /> Üreticiler
          </button>
          <h1>{producer.fullName}</h1>
          <p>İletişim bilgileri, bağlı araziler ve personel notları.</p>
        </div>
        <span className={`officers-status ${producer.isActive ? 'is-active' : 'is-passive'}`}>
          {producer.isActive ? 'Aktif' : 'Pasif'}
        </span>
      </div>

      <div className="officers-detail-grid">
        <article className="officers-detail-card">
          <h2>Profil</h2>
          <div className="officers-detail-identity">
            <span className="officers-avatar officers-avatar-lg" aria-hidden>
              {initials(producer.fullName)}
            </span>
            <div>
              <strong>{producer.fullName}</strong>
              <p>{formatNeighborhood(neighborhood)}</p>
            </div>
          </div>
          <dl className="officers-detail-dl">
            <div>
              <dt>Telefon</dt>
              <dd>{formatPhone(producer.phone)}</dd>
            </div>
            <div>
              <dt>E-posta</dt>
              <dd>{producer.email?.trim() || '—'}</dd>
            </div>
            <div>
              <dt>T.C. Kimlik</dt>
              <dd>{producer.nationalId}</dd>
            </div>
            <div>
              <dt>Adres</dt>
              <dd>{producer.address?.trim() || '—'}</dd>
            </div>
            <div>
              <dt>Bağlı arazi</dt>
              <dd>{lands.length}</dd>
            </div>
            <div>
              <dt>Toplam alan</dt>
              <dd>{formatSize(totalArea)}</dd>
            </div>
          </dl>
          <div className="officers-card-actions" style={{ marginTop: 16 }}>
            {phoneLink ? (
              <a href={phoneLink} className="officers-action-btn">
                <Phone size={14} /> Telefon et
              </a>
            ) : null}
            {messageHref ? (
              <Link to={messageHref} className="officers-action-btn">
                <MessageSquare size={14} /> Mesaj gönder
              </Link>
            ) : null}
          </div>
        </article>

        <article className="officers-detail-card">
          <h2>Notlar</h2>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault()
              if (!noteBody.trim()) return
              addNote.mutate()
            }}
            style={{ marginBottom: 16 }}
          >
            <label>
              Yeni not
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
                placeholder="Görüşme, hatırlatma, saha notu…"
                required
              />
            </label>
            <div className="row-actions">
              <button className="primary-btn" type="submit" disabled={addNote.isPending}>
                {addNote.isPending ? 'Kaydediliyor…' : 'Not ekle'}
              </button>
            </div>
          </form>
          {addNote.error && <p className="error">{(addNote.error as Error).message}</p>}
          {notesQuery.isLoading ? (
            <p className="empty">Yükleniyor…</p>
          ) : notes.length === 0 ? (
            <p className="empty">Henüz not yok.</p>
          ) : (
            <ul className="ops-list">
              {notes.map((n) => (
                <li key={n.id}>
                  <strong>{n.body}</strong>
                  <span>
                    {new Date(n.createdAtUtc).toLocaleString('tr-TR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="officers-detail-card">
        <h2>Bağlı araziler ({lands.length})</h2>
        {landsQuery.isLoading ? (
          <p className="empty">Yükleniyor…</p>
        ) : lands.length === 0 ? (
          <p className="empty">Bu üreticiye atanmış arazi yok.</p>
        ) : (
          <ul className="officers-land-list">
            {lands.map((land) => (
              <li key={land.id}>
                <Link to={`/app/lands/${land.id}`}>
                  <strong>{land.name}</strong>
                  <span>
                    {formatSize(land.sizeInDecares)} · {formatNeighborhood(land.neighborhood)} ·
                    Parsel {land.parcelNumber}
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
