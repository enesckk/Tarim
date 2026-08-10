import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Map as MapIcon,
  MapPin,
  MoreVertical,
  Plus,
  Search,
  Sprout,
  SquareDashed,
  UserRound,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import type { Land, LandMapStatus, Producer } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/roles'
import {
  isSehitkamilNeighborhood,
  neighborhoodSelectOptions,
} from '../constants/sehitkamilNeighborhoods'
import { matchesSearch } from '../utils/search'
import { parseOptionalCoordinates } from '../utils/coordinates'
import '../layout/layout.css'

const emptyForm = {
  name: '',
  neighborhood: '',
  cadastralBlock: '',
  parcelNumber: '',
  sizeInDecares: 1,
  latitude: '',
  longitude: '',
}

type SizeSegment = '0-5' | '5-20' | '20-50' | '50+'

type SortKey = 'name' | 'neighborhood' | 'size-asc' | 'size-desc'

type DraftFilters = {
  neighborhood: string | null
  crops: string[]
  sizeSegments: SizeSegment[]
}

const SIZE_SEGMENTS: { id: SizeSegment; label: string }[] = [
  { id: '0-5', label: '0-5' },
  { id: '5-20', label: '5-20' },
  { id: '20-50', label: '20-50' },
  { id: '50+', label: '50+' },
]

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'name', label: 'Arazi adına göre' },
  { id: 'neighborhood', label: 'Mahalleye göre' },
  { id: 'size-asc', label: 'Küçükten büyüğe' },
  { id: 'size-desc', label: 'Büyükten küçüğe' },
]

const EMPTY_FILTERS: DraftFilters = {
  neighborhood: null,
  crops: [],
  sizeSegments: [],
}

type LandStatusTone = 'green' | 'orange' | 'blue' | 'grey'

function deriveLandStatus(land: Land): { label: string; tone: LandStatusTone } {
  const mapStatus = land.mapStatus as LandMapStatus | undefined
  if (mapStatus === 'harvest') {
    return { label: 'Hasat bekleniyor', tone: 'blue' }
  }
  if (mapStatus === 'today') {
    return { label: 'Planlandı', tone: 'orange' }
  }
  if (land.activeWorkflowName || land.activeCropType) {
    return { label: 'Üretimde', tone: 'green' }
  }
  return { label: 'Beklemede', tone: 'grey' }
}

function matchesSizeSegment(size: number, segment: SizeSegment): boolean {
  switch (segment) {
    case '0-5':
      return size >= 0 && size < 5
    case '5-20':
      return size >= 5 && size < 20
    case '20-50':
      return size >= 20 && size < 50
    case '50+':
      return size >= 50
  }
}

function applyFilters(items: Land[], search: string, filters: DraftFilters): Land[] {
  return items.filter((item) => {
    if (
      !matchesSearch(
        search,
        item.name,
        item.parcelNumber,
        item.neighborhood,
        item.cadastralBlock,
        item.activeCropType,
        item.activeWorkflowName,
      )
    ) {
      return false
    }

    if (filters.neighborhood) {
      const nh = (item.neighborhood ?? '').trim()
      if (nh !== filters.neighborhood) return false
    }

    if (filters.crops.length > 0) {
      const crop = (item.activeCropType ?? '').trim()
      if (!crop || !filters.crops.includes(crop)) return false
    }

    if (filters.sizeSegments.length > 0) {
      const ok = filters.sizeSegments.some((seg) =>
        matchesSizeSegment(item.sizeInDecares, seg),
      )
      if (!ok) return false
    }

    return true
  })
}

function sortLands(items: Land[], sort: SortKey): Land[] {
  const copy = [...items]
  copy.sort((a, b) => {
    switch (sort) {
      case 'neighborhood': {
        const an = (a.neighborhood ?? '').localeCompare(b.neighborhood ?? '', 'tr')
        if (an !== 0) return an
        return a.name.localeCompare(b.name, 'tr')
      }
      case 'size-asc':
        return a.sizeInDecares - b.sizeInDecares || a.name.localeCompare(b.name, 'tr')
      case 'size-desc':
        return b.sizeInDecares - a.sizeInDecares || a.name.localeCompare(b.name, 'tr')
      case 'name':
      default:
        return a.name.localeCompare(b.name, 'tr')
    }
  })
  return copy
}

function formatSize(value: number): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
  return `${rounded} da`
}

export function LandsPage() {
  const { token, user } = useAuth()
  const admin = isAdmin(user?.roles)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [sort, setSort] = useState<SortKey>('name')
  const [sortOpen, setSortOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<DraftFilters>(EMPTY_FILTERS)

  useEffect(() => {
    if (!admin || location.hash !== '#yeni') return
    setShowForm(true)
  }, [admin, location.hash])

  useEffect(() => {
    if (!admin || location.hash !== '#yeni' || !showForm) return
    const el = document.getElementById('yeni-arazi')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [admin, location.hash, showForm])

  useEffect(() => {
    function onDocClick() {
      setSortOpen(false)
      setMenuOpenId(null)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const { data: items = [], error, isLoading } = useQuery({
    queryKey: ['lands'],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token),
  })

  const { data: producers = [] } = useQuery({
    queryKey: ['producers'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token),
  })

  const producerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of producers) {
      map.set(p.id, p.fullName || `${p.firstName} ${p.lastName}`.trim())
    }
    return map
  }, [producers])

  const neighborhoodOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      const key = (item.neighborhood ?? '').trim()
      if (!key || !isSehitkamilNeighborhood(key)) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'tr'))
      .map(([name, count]) => ({ name, count }))
  }, [items])

  const cropOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      const key = (item.activeCropType ?? '').trim()
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'tr'))
      .map(([name, count]) => ({ name, count }))
  }, [items])

  const filteredItems = useMemo(
    () => sortLands(applyFilters(items, search, appliedFilters), sort),
    [items, search, appliedFilters, sort],
  )

  const create = useMutation({
    mutationFn: () => {
      const coords = parseOptionalCoordinates(form.latitude, form.longitude)
      if (!coords.ok) {
        return Promise.reject(new Error(coords.message))
      }
      return api<string>(
        '/api/lands',
        {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            parcelNumber: form.parcelNumber.trim(),
            neighborhood: form.neighborhood.trim() || null,
            sizeInDecares: Number(form.sizeInDecares),
            cadastralBlock: form.cadastralBlock.trim() || null,
            soilType: null,
            soilNotes: null,
            latitude: coords.latitude,
            longitude: coords.longitude,
            city: 'Gaziantep',
            district: 'Şehitkamil',
            producerId: null,
          }),
        },
        token,
      )
    },
    onSuccess: async (newId) => {
      setForm(emptyForm)
      setFormError(null)
      setShowForm(false)
      await queryClient.invalidateQueries({ queryKey: ['lands'] })
      if (newId) navigate(`/app/lands/${newId}`)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const coords = parseOptionalCoordinates(form.latitude, form.longitude)
    if (!coords.ok) {
      setFormError(coords.message)
      return
    }
    create.mutate()
  }

  function toggleCrop(crop: string) {
    setDraftFilters((prev) => ({
      ...prev,
      crops: prev.crops.includes(crop)
        ? prev.crops.filter((c) => c !== crop)
        : [...prev.crops, crop],
    }))
  }

  function toggleSize(segment: SizeSegment) {
    setDraftFilters((prev) => ({
      ...prev,
      sizeSegments: prev.sizeSegments.includes(segment)
        ? prev.sizeSegments.filter((s) => s !== segment)
        : [...prev.sizeSegments, segment],
    }))
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
  }

  function applyDraftFilters() {
    setAppliedFilters(draftFilters)
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? 'Arazi adına göre'
  const activeFilterCount =
    (appliedFilters.neighborhood ? 1 : 0) +
    appliedFilters.crops.length +
    appliedFilters.sizeSegments.length

  return (
    <section className="lands-page">
      <div className="lands-page-header">
        <div>
          <h1>{admin ? 'Araziler' : 'Arazilerim'}</h1>
          <p>
            {admin
              ? 'Arazileri mahalleye göre filtreleyin veya arama ile bulun.'
              : 'Size atanan araziler. Görev gönderimi, onay, üretici sohbeti ve saha işlemleri burada.'}
          </p>
        </div>
        {admin && (
          <button
            type="button"
            className="primary-btn lands-new-btn"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? (
              'Formu kapat'
            ) : (
              <>
                <Plus size={16} aria-hidden />
                Yeni arazi
              </>
            )}
          </button>
        )}
      </div>

      {admin && (
        <div className="lands-create-panel" id="yeni-arazi" hidden={!showForm}>
          {showForm ? (
            <form className="form-grid two-col" onSubmit={onSubmit}>
              <label>
                Arazi adı <span className="required-mark">*</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Örn. Cıkcık"
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
              <label>
                Ada
                <input
                  value={form.cadastralBlock}
                  onChange={(e) => setForm({ ...form, cadastralBlock: e.target.value })}
                  placeholder="Ada no"
                />
              </label>
              <label>
                Parsel <span className="required-mark">*</span>
                <input
                  value={form.parcelNumber}
                  onChange={(e) => setForm({ ...form, parcelNumber: e.target.value })}
                  required
                />
              </label>
              <label>
                Dönüm <span className="required-mark">*</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.sizeInDecares}
                  onChange={(e) => setForm({ ...form, sizeInDecares: Number(e.target.value) })}
                  required
                />
              </label>
              <p className="muted-copy full-span" style={{ margin: 0 }}>
                Harita konumu isteğe bağlıdır. Ada/parsel numaralarını enlem veya boylama yazmayın.
              </p>
              <label>
                Enlem (isteğe bağlı)
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={(e) => {
                    setFormError(null)
                    setForm({ ...form, latitude: e.target.value })
                  }}
                  placeholder="ör. 37.08"
                />
              </label>
              <label>
                Boylam (isteğe bağlı)
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={(e) => {
                    setFormError(null)
                    setForm({ ...form, longitude: e.target.value })
                  }}
                  placeholder="ör. 37.38"
                />
              </label>
              <div style={{ gridColumn: '1 / -1' }}>
                <button className="primary-btn" type="submit" disabled={create.isPending}>
                  {create.isPending ? 'Kaydediliyor…' : 'Kaydet ve aç'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      )}

      {(error || create.error || formError) && (
        <p className="error empty">
          {formError ?? ((create.error ?? error) as Error).message}
        </p>
      )}

      <div className="lands-toolbar">
        <div className="lands-search">
          <Search className="lands-search-icon" size={16} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Arazi adı, mahalle, ada veya parsel ara..."
            aria-label="Arazi adı, mahalle, ada veya parsel ara"
          />
          {search ? (
            <button
              type="button"
              className="lands-search-clear"
              onClick={() => setSearch('')}
              aria-label="Aramayı temizle"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className={`lands-toolbar-btn${showFilters ? ' is-active' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter size={16} aria-hidden />
          Filtrele
          {activeFilterCount > 0 ? <em>{activeFilterCount}</em> : null}
        </button>

        <div className="lands-sort">
          <button
            type="button"
            className="lands-toolbar-btn lands-sort-btn"
            aria-expanded={sortOpen}
            onClick={(e) => {
              e.stopPropagation()
              setSortOpen((v) => !v)
              setMenuOpenId(null)
            }}
          >
            <span>Sırala: {sortLabel}</span>
            <ChevronDown size={15} aria-hidden />
          </button>
          {sortOpen ? (
            <div className="lands-sort-menu" role="listbox" onClick={(e) => e.stopPropagation()}>
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

      {isLoading ? (
        <p className="empty lands-empty">Yükleniyor…</p>
      ) : error ? (
        <p className="error empty lands-empty">
          Araziler yüklenemedi. {(error as Error).message || 'Lütfen yenileyip tekrar deneyin.'}
        </p>
      ) : items.length === 0 ? (
        <p className="empty lands-empty">
          {admin
            ? 'Henüz arazi kaydı yok.'
            : 'Size atanmış arazi yok. Yönetici ataması bekleniyor.'}
        </p>
      ) : (
        <div className={`lands-body${showFilters ? ' has-filters' : ''}`}>
          {showFilters ? (
            <aside className="lands-filters" aria-label="Filtreler">
              <div className="lands-filters-head">
                <h2>Filtreler</h2>
                <button
                  type="button"
                  className="lands-filters-close"
                  onClick={() => setShowFilters(false)}
                  aria-label="Filtreleri kapat"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="lands-filter-section">
                <h3>Mahalle</h3>
                <div className="lands-filter-list" role="radiogroup" aria-label="Mahalle">
                  <label className={`lands-filter-option${draftFilters.neighborhood === null ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="lands-neighborhood"
                      checked={draftFilters.neighborhood === null}
                      onChange={() =>
                        setDraftFilters((prev) => ({ ...prev, neighborhood: null }))
                      }
                    />
                    <span>Tümü</span>
                    <em>{items.length}</em>
                  </label>
                  {neighborhoodOptions.map((opt) => (
                    <label
                      key={opt.name}
                      className={`lands-filter-option${draftFilters.neighborhood === opt.name ? ' is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="lands-neighborhood"
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

              <div className="lands-filter-section">
                <h3>Ürün</h3>
                {cropOptions.length === 0 ? (
                  <p className="lands-filter-empty">Aktif ürün yok</p>
                ) : (
                  <div className="lands-filter-list">
                    {cropOptions.map((opt) => (
                      <label
                        key={opt.name}
                        className={`lands-filter-option${draftFilters.crops.includes(opt.name) ? ' is-selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={draftFilters.crops.includes(opt.name)}
                          onChange={() => toggleCrop(opt.name)}
                        />
                        <span>{opt.name}</span>
                        <em>{opt.count}</em>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="lands-filter-section">
                <h3>Arazi büyüklüğü</h3>
                <p className="lands-filter-hint">Dönüm</p>
                <div className="lands-size-segments" role="group" aria-label="Arazi büyüklüğü">
                  {SIZE_SEGMENTS.map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      className={draftFilters.sizeSegments.includes(seg.id) ? 'is-active' : undefined}
                      onClick={() => toggleSize(seg.id)}
                    >
                      {seg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lands-filters-footer">
                <button type="button" className="lands-clear-btn" onClick={clearFilters}>
                  Temizle
                </button>
                <button type="button" className="primary-btn" onClick={applyDraftFilters}>
                  Uygula
                </button>
              </div>
            </aside>
          ) : null}

          <div className="lands-main">
            <div className="lands-counts">
              <span>Toplam {items.length} arazi</span>
              <span>
                <strong>{filteredItems.length} arazi</strong> gösteriliyor
              </span>
            </div>

            {filteredItems.length === 0 ? (
              <p className="lands-empty">Aramanızla veya filtrelerle eşleşen arazi bulunamadı.</p>
            ) : (
              <div className="lands-grid">
                {filteredItems.map((item) => {
                  const status = deriveLandStatus(item)
                  const producerName = item.producerId
                    ? producerNameById.get(item.producerId) ?? '—'
                    : '—'
                  const cropLabel = item.activeCropType?.trim() || '—'
                  const alertCount = item.alertCount ?? 0
                  const menuOpen = menuOpenId === item.id

                  return (
                    <article key={item.id} className="lands-card">
                      <div className="lands-card-top">
                        <div className="lands-card-title-row">
                          <span className="lands-card-icon" aria-hidden>
                            <MapIcon size={18} />
                          </span>
                          <h3>{item.name}</h3>
                          <div className="lands-card-menu-wrap">
                            <button
                              type="button"
                              className="lands-card-menu-btn"
                              aria-label={`${item.name} menü`}
                              aria-expanded={menuOpen}
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpenId(menuOpen ? null : item.id)
                                setSortOpen(false)
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>
                            {menuOpen ? (
                              <div
                                className="lands-card-menu"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link to={`/app/lands/${item.id}`} onClick={() => setMenuOpenId(null)}>
                                  Arazi Merkezi
                                </Link>
                                <Link
                                  to={`/app/lands/${item.id}#uretim`}
                                  onClick={() => setMenuOpenId(null)}
                                >
                                  Üretim planı
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="lands-card-meta">
                          <span>
                            <MapPin size={14} aria-hidden />
                            {item.neighborhood?.trim() || '—'}
                          </span>
                          <span>Ada {item.cadastralBlock?.trim() || '—'}</span>
                          <span>Parsel {item.parcelNumber || '—'}</span>
                          <span>
                            <SquareDashed size={14} aria-hidden />
                            {formatSize(item.sizeInDecares)}
                          </span>
                        </div>

                        <div className="lands-card-status-row">
                          <span className={`lands-status lands-status-${status.tone}`}>
                            <i aria-hidden />
                            {status.label}
                          </span>
                          <span
                            className={`lands-task-badge${alertCount > 0 ? ' has-count' : ''}`}
                            title={
                              alertCount > 0
                                ? `${alertCount} açık uyarı / gecikmiş görev`
                                : 'Açık uyarı yok'
                            }
                          >
                            {alertCount > 0 ? alertCount : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="lands-card-divider" />

                      <div className="lands-card-footer">
                        <div className="lands-card-people">
                          <span>
                            <UserRound size={14} aria-hidden />
                            <small>Üretici</small>
                            <strong>{producerName}</strong>
                          </span>
                          <span>
                            <Sprout size={14} aria-hidden />
                            <small>Ürün</small>
                            <strong>{cropLabel}</strong>
                          </span>
                        </div>
                        <Link to={`/app/lands/${item.id}`} className="lands-card-link">
                          Arazi Merkezi
                          <ChevronRight size={14} aria-hidden />
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
