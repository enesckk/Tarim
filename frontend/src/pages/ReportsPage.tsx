import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ChevronRight,
  Download,
  MapPin,
  Sprout,
  Users,
  Wheat,
} from 'lucide-react'
import { api } from '../api/client'
import type { HarvestRecord, Land, Producer, StaffUser } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/roles'
import '../layout/layout.css'

type ReportId = 'producers' | 'officers' | 'lands' | 'harvests'

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('tr-TR')
}

function formatMoney(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => {
    const s = v ?? ''
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.map(escape).join(';'), ...rows.map((r) => r.map(escape).join(';'))]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const { token, user } = useAuth()
  const admin = isAdmin(user?.roles)
  const [active, setActive] = useState<ReportId | null>(null)

  const producersQuery = useQuery({
    queryKey: ['producers', 'reports'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token),
  })

  const officersQuery = useQuery({
    queryKey: ['staff-officers', 'reports'],
    queryFn: () => api<StaffUser[]>('/api/staff/officers', {}, token),
    enabled: Boolean(token && admin),
  })

  const landsQuery = useQuery({
    queryKey: ['lands', 'reports'],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token),
  })

  const harvestsQuery = useQuery({
    queryKey: ['harvests', 'reports'],
    queryFn: () => api<HarvestRecord[]>('/api/harvest', {}, token),
    enabled: Boolean(token),
  })

  const producers = producersQuery.data ?? []
  const officers = officersQuery.data ?? []
  const lands = landsQuery.data ?? []
  const harvests = harvestsQuery.data ?? []

  const producerName = (id: string) =>
    producers.find((p) => p.id === id)?.fullName ?? id.slice(0, 8)

  const landName = (id: string) =>
    lands.find((l) => l.id === id)?.name ?? id.slice(0, 8)

  function exportProducers() {
    downloadCsv(
      'ureticiler.csv',
      ['Ad Soyad', 'Telefon', 'E-posta', 'T.C. Kimlik', 'Adres', 'Durum'],
      producers.map((p) => [
        p.fullName,
        p.phone ?? '',
        p.email ?? '',
        p.nationalId,
        p.address ?? '',
        p.isActive ? 'Aktif' : 'Pasif',
      ]),
    )
  }

  function exportOfficers() {
    downloadCsv(
      'tarim-uzmanlari.csv',
      ['Ad Soyad', 'E-posta', 'Telefon'],
      officers.map((o) => [o.fullName, o.email ?? '', o.phoneNumber ?? '']),
    )
  }

  function exportLands() {
    downloadCsv(
      'araziler.csv',
      ['Ad', 'Parsel', 'Dekar', 'Mahalle', 'Koordinat', 'Aktif'],
      lands.map((l) => [
        l.name,
        l.parcelNumber,
        String(l.sizeInDecares ?? ''),
        l.neighborhood ?? '',
        l.latitude != null && l.longitude != null
          ? `${l.latitude}, ${l.longitude}`
          : '',
        l.isActive ? 'Evet' : 'Hayır',
      ]),
    )
  }

  function exportHarvests() {
    downloadCsv(
      'hasat-kayitlari.csv',
      [
        'Ürün',
        'Miktar',
        'Birim',
        'Hasat Tarihi',
        'Alıcı',
        'Birim Fiyat (TRY)',
        'Toplam (TRY)',
        'Üretici',
        'Arazi',
      ],
      harvests.map((h) => [
        h.productName,
        String(h.quantity),
        h.unit,
        formatDate(h.harvestDate),
        h.buyerName ?? '',
        h.unitPrice != null ? String(h.unitPrice) : '',
        h.totalAmount != null ? String(h.totalAmount) : '',
        producerName(h.producerId),
        landName(h.landId),
      ]),
    )
  }

  const cards: {
    id: ReportId
    title: string
    desc: string
    count: number
    loading: boolean
    icon: typeof Users
    adminOnly?: boolean
    onExport: () => void
  }[] = [
    {
      id: 'producers',
      title: 'Üretici Listesi',
      desc: 'Kayıtlı üreticiler — iletişim ve durum',
      count: producers.length,
      loading: producersQuery.isLoading,
      icon: Sprout,
      onExport: exportProducers,
    },
    {
      id: 'officers',
      title: 'Tarım Uzmanı Listesi',
      desc: 'Saha uzmanları — e-posta ve telefon',
      count: officers.length,
      loading: officersQuery.isLoading,
      icon: Users,
      adminOnly: true,
      onExport: exportOfficers,
    },
    {
      id: 'lands',
      title: 'Arazi Listesi',
      desc: 'Tüm araziler — parsel, mahalle, büyüklük',
      count: lands.length,
      loading: landsQuery.isLoading,
      icon: MapPin,
      onExport: exportLands,
    },
    {
      id: 'harvests',
      title: 'Hasat Kayıtları',
      desc: 'Hasat miktarı, alıcı ve satış fiyatları',
      count: harvests.length,
      loading: harvestsQuery.isLoading,
      icon: Wheat,
      onExport: exportHarvests,
    },
  ]

  const visibleCards = cards.filter((c) => !c.adminOnly || admin)

  if (active) {
    return (
      <section className="reports-page">
        <ReportDetail
          id={active}
          admin={admin}
          producers={producers}
          officers={officers}
          lands={lands}
          harvests={harvests}
          producerName={producerName}
          landName={landName}
          loading={
            active === 'producers'
              ? producersQuery.isLoading
              : active === 'officers'
                ? officersQuery.isLoading
                : active === 'lands'
                  ? landsQuery.isLoading
                  : harvestsQuery.isLoading
          }
          error={
            active === 'producers'
              ? producersQuery.error
              : active === 'officers'
                ? officersQuery.error
                : active === 'lands'
                  ? landsQuery.error
                  : harvestsQuery.error
          }
          onBack={() => setActive(null)}
          onExport={
            active === 'producers'
              ? exportProducers
              : active === 'officers'
                ? exportOfficers
                : active === 'lands'
                  ? exportLands
                  : exportHarvests
          }
        />
      </section>
    )
  }

  return (
    <section className="reports-page">
      <div className="page-header">
        <div>
          <h1>Raporlar</h1>
          <p>Listeleri görüntüleyin veya CSV olarak indirin.</p>
        </div>
      </div>

      <div className="report-card-grid">
        {visibleCards.map((card) => {
          const Icon = card.icon
          return (
            <article key={card.id} className="report-card">
              <div className="report-card-icon" aria-hidden>
                <Icon className="size-5" />
              </div>
              <div className="report-card-body">
                <h2>{card.title}</h2>
                <p>{card.desc}</p>
                <span className="report-card-count">
                  {card.loading ? 'Yükleniyor…' : `${card.count} kayıt`}
                </span>
              </div>
              <div className="report-card-actions">
                <button
                  type="button"
                  className="report-card-btn report-card-btn-primary"
                  disabled={card.loading || card.count === 0}
                  onClick={() => setActive(card.id)}
                >
                  Görüntüle
                  <ChevronRight className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className="report-card-btn"
                  disabled={card.loading || card.count === 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    card.onExport()
                  }}
                >
                  <Download className="size-4" aria-hidden />
                  CSV indir
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ReportDetail({
  id,
  admin,
  producers,
  officers,
  lands,
  harvests,
  producerName,
  landName,
  loading,
  error,
  onBack,
  onExport,
}: {
  id: ReportId
  admin: boolean
  producers: Producer[]
  officers: StaffUser[]
  lands: Land[]
  harvests: HarvestRecord[]
  producerName: (id: string) => string
  landName: (id: string) => string
  loading: boolean
  error: unknown
  onBack: () => void
  onExport: () => void
}) {
  const meta = {
    producers: {
      title: 'Üretici Listesi',
      count: producers.length,
      empty: 'Üretici kaydı yok.',
    },
    officers: {
      title: 'Tarım Uzmanı Listesi',
      count: officers.length,
      empty: 'Uzman kaydı yok.',
    },
    lands: {
      title: 'Arazi Listesi',
      count: lands.length,
      empty: 'Arazi kaydı yok.',
    },
    harvests: {
      title: 'Hasat Kayıtları',
      count: harvests.length,
      empty: 'Hasat kaydı yok.',
    },
  }[id]

  if (id === 'officers' && !admin) {
    return null
  }

  return (
    <>
      <div className="report-detail-header">
        <button type="button" className="ghost-btn report-back-btn" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden />
          Raporlara dön
        </button>
        <div className="report-detail-title">
          <h1>{meta.title}</h1>
          <span className="report-detail-count">{meta.count} kayıt</span>
        </div>
        <button
          type="button"
          className="primary-btn report-download-btn"
          disabled={loading || meta.count === 0}
          onClick={onExport}
        >
          <Download className="size-4" aria-hidden />
          CSV indir
        </button>
      </div>

      <div className="panel report-detail-panel">
        {error != null && (
          <p className="error empty">{(error as Error).message}</p>
        )}
        {loading && <p className="empty">Yükleniyor…</p>}

        {!loading && !error && meta.count === 0 && (
          <p className="empty">{meta.empty}</p>
        )}

        {!loading && id === 'producers' && producers.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Ad soyad</th>
                <th>Telefon</th>
                <th>E-posta</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {producers.map((p) => (
                <tr key={p.id}>
                  <td>{p.fullName}</td>
                  <td>{p.phone || '—'}</td>
                  <td>{p.email ?? '—'}</td>
                  <td>{p.isActive ? 'Aktif' : 'Pasif'}</td>
                  <td>
                    <Link to={`/producers/${p.id}`} className="text-link">
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && id === 'officers' && officers.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Ad soyad</th>
                <th>E-posta</th>
                <th>Telefon</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o) => (
                <tr key={o.id}>
                  <td>{o.fullName}</td>
                  <td>{o.email ?? '—'}</td>
                  <td>{o.phoneNumber ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && id === 'lands' && lands.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Parsel</th>
                <th>Mahalle</th>
                <th>Dekar</th>
                <th>Koordinat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lands.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td>{l.parcelNumber}</td>
                  <td>{l.neighborhood ?? '—'}</td>
                  <td>{l.sizeInDecares ?? '—'}</td>
                  <td>
                    {l.latitude != null && l.longitude != null
                      ? `${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}`
                      : '—'}
                  </td>
                  <td>
                    <Link to={`/lands/${l.id}`} className="text-link">
                      Aç
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && id === 'harvests' && harvests.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Hasat tarihi</th>
                <th>Alıcı</th>
                <th>Birim fiyat</th>
                <th>Toplam</th>
                <th>Üretici</th>
                <th>Arazi</th>
              </tr>
            </thead>
            <tbody>
              {harvests.map((h) => (
                <tr key={h.id}>
                  <td>{h.productName}</td>
                  <td>
                    {h.quantity} {h.unit}
                  </td>
                  <td>{formatDate(h.harvestDate)}</td>
                  <td>{h.buyerName ?? '—'}</td>
                  <td>{h.unitPrice != null ? `${formatMoney(h.unitPrice)} ₺` : '—'}</td>
                  <td>{h.totalAmount != null ? `${formatMoney(h.totalAmount)} ₺` : '—'}</td>
                  <td>{producerName(h.producerId)}</td>
                  <td>
                    <Link to={`/lands/${h.landId}`} className="text-link">
                      {landName(h.landId)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
