import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ChevronRight,
  Download,
  MapPin,
  Plane,
  Sprout,
  Users,
  Wheat,
} from 'lucide-react'
import { api } from '../api/client'
import type { HarvestRecord, Land, Producer, StaffUser } from '../api/types'
import {
  resolveTarimAiAssetUrl,
  tarimAi,
  type AnalysisResult,
  type ApplicantInputsSummary,
  type DroneImageItem,
  type LandAnalysisSummary,
} from '../api/tarimAi'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/roles'
import '../layout/layout.css'

type ReportId = 'producers' | 'officers' | 'lands' | 'harvests' | 'analyses' | 'drones'
type ReportsTab = 'ops' | 'ai'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('tr-TR')
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('tr-TR')
}

function formatMoney(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatStatus(status?: string) {
  if (status === 'completed') return 'Tamamlandı'
  if (status === 'partial_completed') return 'Tamamlandı (kısmi)'
  if (status === 'failed') return 'Başarısız'
  if (status === 'processing' || status === 'queued') return 'İşleniyor'
  return status?.replaceAll('_', ' ') || '—'
}

function formatLabel(value?: string | null) {
  if (!value) return '—'
  return value.replaceAll('_', ' ')
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [active, setActive] = useState<ReportId | null>(null)
  const tab: ReportsTab = searchParams.get('tab') === 'ai' ? 'ai' : 'ops'

  function setTab(next: ReportsTab) {
    setActive(null)
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'ai') params.set('tab', 'ai')
        else params.delete('tab')
        return params
      },
      { replace: true },
    )
  }

  const producersQuery = useQuery({
    queryKey: ['producers', 'reports'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token && admin),
  })

  const officersQuery = useQuery({
    queryKey: ['staff-officers', 'reports'],
    queryFn: () => api<StaffUser[]>('/api/staff/officers', {}, token),
    enabled: Boolean(token && admin),
  })

  const landsQuery = useQuery({
    queryKey: ['lands', 'reports'],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token && admin),
  })

  const harvestsQuery = useQuery({
    queryKey: ['harvests', 'reports'],
    queryFn: () => api<HarvestRecord[]>('/api/harvest', {}, token),
    enabled: Boolean(token && admin),
  })

  const analysesQuery = useQuery({
    queryKey: ['land-analyses', 'reports'],
    queryFn: () => tarimAi.listLandAnalyses(),
    enabled: Boolean(token && admin),
    retry: 2,
    refetchOnWindowFocus: true,
  })

  const dronesQuery = useQuery({
    queryKey: ['drone-images', 'reports'],
    queryFn: () => tarimAi.listDroneImages(),
    enabled: Boolean(token && admin),
    retry: 2,
    refetchOnWindowFocus: true,
  })

  const producers = producersQuery.data ?? []
  const officers = officersQuery.data ?? []
  const lands = landsQuery.data ?? []
  const harvests = harvestsQuery.data ?? []
  const analyses = analysesQuery.data?.items ?? []
  const drones = dronesQuery.data?.items ?? []

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
      ['Ad', 'Mahalle', 'Ada', 'Parsel', 'Dönüm', 'Aktif'],
      lands.map((l) => [
        l.name,
        l.neighborhood ?? '',
        l.cadastralBlock ?? '',
        l.parcelNumber,
        String(l.sizeInDecares ?? ''),
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

  function exportAnalyses() {
    downloadCsv(
      'arazi-analizleri.csv',
      [
        'Arazi',
        'İl',
        'İlçe',
        'Mahalle',
        'Ada',
        'Parsel',
        'Durum',
        'Kullanılabilirlik',
        'Skor',
        'Güven',
        'NDVI',
        'Ürün önerileri',
        'Tarih',
        'Analiz ID',
      ],
      analyses.map((a) => [
        a.landId ? landName(a.landId) : '',
        a.parcel?.province ?? '',
        a.parcel?.district ?? '',
        a.parcel?.neighborhood ?? '',
        a.parcel?.block ?? '',
        a.parcel?.parcel ?? '',
        formatStatus(a.status),
        a.summary?.landUsabilityClassification ?? '',
        a.summary?.landUsabilityScore != null ? String(a.summary.landUsabilityScore) : '',
        a.summary?.confidenceLevel ?? '',
        a.summary?.ndviMean != null ? String(a.summary.ndviMean) : '',
        (a.summary?.topCrops ?? []).map((c) => c.cropName).join(', '),
        formatDateTime(a.completedAt ?? a.updatedAt),
        a.analysisId,
      ]),
    )
  }

  function exportDrones() {
    downloadCsv(
      'drone-goruntuleri.csv',
      [
        'Arazi',
        'Çekim tarihi',
        'Yükleme tarihi',
        'Dosya',
        'Boyut (KB)',
        'İl',
        'İlçe',
        'Mahalle',
        'Ada',
        'Parsel',
        'Analiz ID',
        'Not',
      ],
      drones.map((d) => [
        d.landName || (d.landId ? landName(d.landId) : ''),
        formatDate(d.capturedAt),
        formatDateTime(d.uploadedAt),
        d.fileName,
        d.byteSize != null ? String(Math.round(d.byteSize / 1024)) : '',
        d.parcel?.province ?? '',
        d.parcel?.district ?? '',
        d.parcel?.neighborhood ?? '',
        d.parcel?.block ?? '',
        d.parcel?.parcel ?? '',
        d.analysisId ?? '',
        d.note ?? '',
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
      desc: admin
        ? 'Tüm araziler — parsel, mahalle, büyüklük'
        : 'Atandığınız araziler — parsel, mahalle, büyüklük',
      count: lands.length,
      loading: landsQuery.isLoading,
      icon: MapPin,
      onExport: exportLands,
    },
    {
      id: 'drones',
      title: 'Drone Görüntüleri',
      desc: 'Araziye bağlı drone görüntüleri — çekim tarihi ve dosya bilgisi',
      count: drones.length,
      loading: dronesQuery.isLoading,
      icon: Plane,
      onExport: exportDrones,
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

  if (!admin) return <Navigate to="/" replace />

  if (tab === 'ai' || active === 'analyses') {
    return (
      <section className="reports-page">
        <div className="page-header">
          <div>
            <h1>Raporlar</h1>
            <p>Operasyon listeleri ve AI Destekli Analiz geçmişi.</p>
          </div>
        </div>

        <div className="reports-tabs" role="tablist" aria-label="Rapor bölümleri">
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="reports-tab"
            onClick={() => setTab('ops')}
          >
            Operasyon raporları
          </button>
          <button
            type="button"
            role="tab"
            aria-selected
            className="reports-tab is-active"
            onClick={() => setTab('ai')}
          >
            AI analiz geçmişi
            <span className="reports-tab-count">
              {analysesQuery.isLoading ? '…' : analyses.length}
            </span>
          </button>
        </div>

        <ReportDetail
          id="analyses"
          admin={admin}
          producers={producers}
          officers={officers}
          lands={lands}
          harvests={harvests}
          analyses={analyses}
          drones={drones}
          producerName={producerName}
          landName={landName}
          loading={analysesQuery.isLoading}
          error={analysesQuery.error}
          hideBack
          onBack={() => setTab('ops')}
          onExport={exportAnalyses}
        />
      </section>
    )
  }

  if (active) {
    return (
      <section className="reports-page">
        <div className="page-header">
          <div>
            <h1>Raporlar</h1>
            <p>Operasyon listeleri ve AI Destekli Analiz geçmişi.</p>
          </div>
        </div>

        <div className="reports-tabs" role="tablist" aria-label="Rapor bölümleri">
          <button
            type="button"
            role="tab"
            aria-selected
            className="reports-tab is-active"
            onClick={() => setTab('ops')}
          >
            Operasyon raporları
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="reports-tab"
            onClick={() => setTab('ai')}
          >
            AI analiz geçmişi
            <span className="reports-tab-count">
              {analysesQuery.isLoading ? '…' : analyses.length}
            </span>
          </button>
        </div>

        <ReportDetail
          id={active}
          admin={admin}
          producers={producers}
          officers={officers}
          lands={lands}
          harvests={harvests}
          analyses={analyses}
          drones={drones}
          producerName={producerName}
          landName={landName}
          loading={
            active === 'producers'
              ? producersQuery.isLoading
              : active === 'officers'
                ? officersQuery.isLoading
                : active === 'lands'
                  ? landsQuery.isLoading
                  : active === 'drones'
                    ? dronesQuery.isLoading
                    : harvestsQuery.isLoading
          }
          error={
            active === 'producers'
              ? producersQuery.error
              : active === 'officers'
                ? officersQuery.error
                : active === 'lands'
                  ? landsQuery.error
                  : active === 'drones'
                    ? dronesQuery.error
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
                  : active === 'drones'
                    ? exportDrones
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
          <p>Operasyon listeleri ve AI Destekli Analiz geçmişi.</p>
        </div>
      </div>

      <div className="reports-tabs" role="tablist" aria-label="Rapor bölümleri">
        <button
          type="button"
          role="tab"
          aria-selected
          className="reports-tab is-active"
          onClick={() => setTab('ops')}
        >
          Operasyon raporları
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          className="reports-tab"
          onClick={() => setTab('ai')}
        >
          AI analiz geçmişi
          <span className="reports-tab-count">
            {analysesQuery.isLoading ? '…' : analyses.length}
          </span>
        </button>
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
  analyses,
  drones,
  producerName,
  landName,
  loading,
  error,
  hideBack,
  onBack,
  onExport,
}: {
  id: ReportId
  admin: boolean
  producers: Producer[]
  officers: StaffUser[]
  lands: Land[]
  harvests: HarvestRecord[]
  analyses: LandAnalysisSummary[]
  drones: DroneImageItem[]
  producerName: (id: string) => string
  landName: (id: string) => string
  loading: boolean
  error: unknown
  hideBack?: boolean
  onBack: () => void
  onExport: () => void
}) {
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)
  const selectedAnalysis = analyses.find((a) => a.analysisId === selectedAnalysisId) ?? null
  const fullAnalysisQuery = useQuery({
    queryKey: ['land-analysis-full', selectedAnalysisId],
    queryFn: () => tarimAi.getCachedAnalysis(selectedAnalysisId!, { full: true }),
    enabled: Boolean(selectedAnalysisId),
  })

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
    analyses: {
      title: 'AI analiz geçmişi',
      count: analyses.length,
      empty:
        'Henüz kayıtlı arazi analizi yok. AI Destekli Analiz’de bir arazi seçip analiz çalıştırın; sonuç burada listelenir.',
    },
    drones: {
      title: 'Drone Görüntüleri',
      count: drones.length,
      empty: 'Henüz drone görüntüsü yok. Arazi detayından çekim tarihiyle ekleyin.',
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
        {!hideBack ? (
          <button type="button" className="ghost-btn report-back-btn" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden />
            Raporlara dön
          </button>
        ) : (
          <div />
        )}
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
          <p className="error empty">
            {(error as Error).message ||
              'AI Destekli Analiz servisine ulaşılamadı. :4000 adresinin çalıştığından emin olun.'}
          </p>
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
                <th>Mahalle</th>
                <th>Ada</th>
                <th>Parsel</th>
                <th>Dönüm</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lands.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td>{l.neighborhood ?? '—'}</td>
                  <td>{l.cadastralBlock ?? '—'}</td>
                  <td>{l.parcelNumber}</td>
                  <td>{l.sizeInDecares ?? '—'}</td>
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

        {!loading && id === 'analyses' && analyses.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Arazi / parsel</th>
                <th>Durum</th>
                <th>Kullanılabilirlik</th>
                <th>Skor</th>
                <th>Güven</th>
                <th>NDVI</th>
                <th>Ürün önerileri</th>
                <th>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => {
                const parcelLabel = [
                  a.parcel?.neighborhood,
                  a.parcel?.block && a.parcel?.parcel
                    ? `${a.parcel.block}/${a.parcel.parcel}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
                const title = a.landId ? landName(a.landId) : parcelLabel || 'Parsel analizi'
                const topCrops = (a.summary?.topCrops ?? [])
                  .slice(0, 3)
                  .map((c) => c.cropName)
                  .join(', ')
                return (
                  <tr key={`${a.analysisId}-${a.landId ?? parcelLabel}`}>
                    <td>
                      <div>{title}</div>
                      {a.landId && parcelLabel ? (
                        <div className="muted-copy" style={{ padding: 0, marginTop: 2 }}>
                          {parcelLabel}
                        </div>
                      ) : null}
                    </td>
                    <td>{formatStatus(a.status)}</td>
                    <td>{formatLabel(a.summary?.landUsabilityClassification)}</td>
                    <td>
                      {a.summary?.landUsabilityScore != null
                        ? a.summary.landUsabilityScore
                        : '—'}
                    </td>
                    <td>{a.summary?.confidenceLevel || '—'}</td>
                    <td>
                      {a.summary?.ndviMean != null ? a.summary.ndviMean.toFixed(3) : '—'}
                    </td>
                    <td>{topCrops || '—'}</td>
                    <td>{formatDateTime(a.completedAt ?? a.updatedAt)}</td>
                    <td>
                      <div className="row-actions" style={{ gap: 8 }}>
                        {a.landId ? (
                          <Link to={`/lands/${a.landId}`} className="text-link">
                            Arazi
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="text-link"
                          style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                          onClick={() => setSelectedAnalysisId(a.analysisId)}
                        >
                          İncele
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!loading && id === 'analyses' && selectedAnalysis ? (
          <AnalysisReportPanel
            summary={selectedAnalysis}
            landName={landName}
            full={fullAnalysisQuery.data?.result}
            loading={fullAnalysisQuery.isLoading}
            error={fullAnalysisQuery.error}
            onClose={() => setSelectedAnalysisId(null)}
          />
        ) : null}

        {!loading && id === 'drones' && drones.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Önizleme</th>
                <th>Arazi</th>
                <th>Çekim tarihi</th>
                <th>Dosya</th>
                <th>Parsel</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {drones.map((d) => {
                const src = resolveTarimAiAssetUrl(d.imageUrl)
                const parcelLabel = [
                  d.parcel?.neighborhood,
                  d.parcel?.block && d.parcel?.parcel
                    ? `${d.parcel.block}/${d.parcel.parcel}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <tr key={d.id}>
                    <td>
                      {src ? (
                        <a href={src} target="_blank" rel="noreferrer" className="report-drone-thumb">
                          <img src={src} alt={d.fileName} loading="lazy" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{d.landName || (d.landId ? landName(d.landId) : '—')}</td>
                    <td>{formatDate(d.capturedAt)}</td>
                    <td>{d.fileName}</td>
                    <td>{parcelLabel || '—'}</td>
                    <td>
                      {d.landId ? (
                        <Link to={`/lands/${d.landId}#drone-goruntuler`} className="text-link">
                          Arazi
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
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

function strVal(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

function AnalysisReportPanel({
  summary,
  landName,
  full,
  loading,
  error,
  onClose,
}: {
  summary: LandAnalysisSummary
  landName: (id: string) => string
  full?: AnalysisResult
  loading: boolean
  error: unknown
  onClose: () => void
}) {
  const title = summary.landId ? landName(summary.landId) : 'Parsel analizi'
  const sources = full?.dataSources ?? []
  const crops = (full?.cropRecommendations ?? summary.summary.topCrops ?? []).slice(0, 8)
  const nextActions = full?.recommendedNextActions ?? []
  const limitations = full?.limitations ?? summary.summary.limitations ?? []
  const lu = (full?.landUsability ?? {}) as Record<string, unknown>
  const terrain = (full?.terrain ?? {}) as Record<string, unknown>
  const climate = (full?.climate ?? {}) as Record<string, unknown>
  const soil = (full?.soil ?? {}) as Record<string, unknown>
  const confidence = (full?.confidence ?? {}) as Record<string, unknown>
  const ndvi =
    (
      (
        ((full?.satellite as Record<string, unknown> | undefined)?.selectedObservation as
          | Record<string, unknown>
          | undefined)?.ndvi as Record<string, unknown> | undefined
      )?.statistics as Record<string, unknown> | undefined
    ) ?? null

  return (
    <div className="report-analysis-panel">
      <div className="report-analysis-panel-head">
        <div>
          <h2>{title}</h2>
          <p>
            Analiz tarihi:{' '}
            <strong>{formatDateTime(summary.completedAt ?? summary.updatedAt)}</strong>
            {' · '}
            Durum: <strong>{formatStatus(summary.status)}</strong>
          </p>
        </div>
        <button type="button" className="ghost-btn" onClick={onClose}>
          Kapat
        </button>
      </div>

      {loading ? <p className="empty">Detaylar yükleniyor…</p> : null}
      {error != null ? (
        <p className="error empty">{(error as Error).message || 'Detay alınamadı.'}</p>
      ) : null}

      <section className="report-analysis-section">
        <h3>1. Yapılan testler ve veri kaynakları</h3>
        <p className="muted-copy" style={{ padding: 0 }}>
          Analizde kullanılan katmanlar ve verinin nereden alındığı.
        </p>
        {(() => {
          const inputs =
            (full?.applicantInputs as ApplicantInputsSummary | null | undefined) ??
            summary.summary.applicantInputs ??
            null
          if (!inputs) return null
          const soil = inputs.soil
          const irr = inputs.irrigation
          const availLabel: Record<string, string> = {
            unavailable: 'Yok',
            available_limited: 'Var ama sınırlı',
            available_and_sufficient: 'Var ve yeterli',
            unknown: 'Bilinmiyor',
          }
          return (
            <div className="report-analysis-details" style={{ marginBottom: 12 }}>
              <div>
                <h4>Toprak girişi</h4>
                <p>
                  {inputs.soilMode === 'pdf'
                    ? `PDF yüklendi${
                        inputs.soilAttachment?.fileName
                          ? ` (${inputs.soilAttachment.fileName})`
                          : ''
                      }`
                    : inputs.soilMode === 'enter'
                      ? inputs.soilValuesUsed
                        ? 'Elle girildi ve kullanıldı'
                        : 'Elle seçildi (değer yok)'
                      : 'Yoksa devam (SoilGrids)'}
                </p>
                {soil && inputs.soilMode === 'enter' ? (
                  <p>
                    pH: {strVal(soil.ph)} · EC: {strVal(soil.ecDsM)} dS/m · Org. madde:{' '}
                    {strVal(soil.organicMatterPercent)}% · Kil/Kum/Silt:{' '}
                    {strVal(soil.clayPercent)}/{strVal(soil.sandPercent)}/{strVal(soil.siltPercent)}
                  </p>
                ) : null}
              </div>
              <div>
                <h4>Sulama suyu girişi</h4>
                <p>
                  {inputs.irrigationMode === 'pdf'
                    ? `PDF yüklendi${
                        inputs.irrigationAttachment?.fileName
                          ? ` (${inputs.irrigationAttachment.fileName})`
                          : ''
                      }`
                    : inputs.irrigationMode === 'enter'
                      ? `Mevcudiyet: ${availLabel[String(inputs.irrigationAvailability ?? irr?.availability ?? 'unknown')] ?? '—'}${
                          inputs.irrigationQualityUsed ? ' · kalite girildi' : ' · kalite girilmedi'
                        }`
                      : 'Yoksa devam'}
                </p>
                {irr && inputs.irrigationMode === 'enter' && inputs.irrigationQualityUsed ? (
                  <p>
                    EC: {strVal(irr.ecDsM)} dS/m · SAR: {strVal(irr.sar)} · pH: {strVal(irr.ph)}
                  </p>
                ) : null}
              </div>
            </div>
          )
        })()}
        {sources.length === 0 && !loading ? (
          <p className="empty">Kaynak listesi yok.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Kaynak</th>
                <th>Durum</th>
                <th>Tür</th>
                <th>Kalite</th>
                <th>Tahmini / ölçülen</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, idx) => (
                <tr key={`${strVal(s.key)}-${idx}`}>
                  <td>{strVal(s.label ?? s.key)}</td>
                  <td>{formatLabel(strVal(s.status))}</td>
                  <td>{formatLabel(strVal(s.dataType))}</td>
                  <td>{formatLabel(strVal(s.quality))}</td>
                  <td>
                    {s.isEstimated ? 'Tahmini' : s.isMeasured ? 'Ölçülen' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {limitations.length > 0 ? (
          <ul className="report-analysis-list">
            {limitations.map((item) => (
              <li key={item}>{formatLabel(item)}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="report-analysis-section">
        <h3>2. Öneriler</h3>
        <div className="report-analysis-grid">
          <div>
            <span className="land-hero-meta-label">Kullanılabilirlik</span>
            <strong>
              {formatLabel(
                strVal(lu.classification ?? summary.summary.landUsabilityClassification),
              )}
            </strong>
          </div>
          <div>
            <span className="land-hero-meta-label">Skor</span>
            <strong>
              {strVal(lu.score ?? summary.summary.landUsabilityScore)}
            </strong>
          </div>
          <div>
            <span className="land-hero-meta-label">Güven</span>
            <strong>
              {formatLabel(strVal(confidence.level ?? summary.summary.confidenceLevel))}
            </strong>
          </div>
          <div>
            <span className="land-hero-meta-label">NDVI ort.</span>
            <strong>
              {ndvi?.mean != null
                ? Number(ndvi.mean).toFixed(3)
                : summary.summary.ndviMean != null
                  ? summary.summary.ndviMean.toFixed(3)
                  : '—'}
            </strong>
          </div>
        </div>
        <h4>Ürün önerileri</h4>
        <ul className="report-analysis-list">
          {crops.map((c, idx) => {
            const name = 'cropName' in c ? c.cropName : strVal((c as { cropName?: string }).cropName)
            const score = 'score' in c ? c.score : undefined
            const rank = 'rank' in c ? c.rank : idx + 1
            const explanation =
              'explanation' in c && typeof (c as { explanation?: string }).explanation === 'string'
                ? (c as { explanation?: string }).explanation
                : undefined
            return (
              <li key={`${rank}-${name}`}>
                <strong>
                  #{rank} {name}
                  {typeof score === 'number' ? ` · ${score.toFixed(1)}` : ''}
                </strong>
                {explanation ? <div>{explanation}</div> : null}
              </li>
            )
          })}
        </ul>
        <h4>Sonraki adımlar</h4>
        {nextActions.length ? (
          <ul className="report-analysis-list">
            {nextActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : (
          <p className="empty">Öneri adımı yok.</p>
        )}
      </section>

      <section className="report-analysis-section">
        <h3>3. Detaylar</h3>
        <div className="report-analysis-details">
          <div>
            <h4>Parsel</h4>
            <p>
              {[
                summary.parcel.province,
                summary.parcel.district,
                summary.parcel.neighborhood,
                `${summary.parcel.block}/${summary.parcel.parcel}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div>
            <h4>Arazi (DEM)</h4>
            <p>Kaynak: {strVal(terrain.source)}</p>
            <p>
              Eğim ort.: {strVal((terrain.slope as Record<string, unknown> | undefined)?.meanDegrees)}°
              {' · '}
              Rakım ort.:{' '}
              {strVal((terrain.elevation as Record<string, unknown> | undefined)?.meanMeters)} m
            </p>
          </div>
          <div>
            <h4>İklim</h4>
            <p>Kaynak: {strVal(climate.source)}</p>
            <p>
              Yıllık yağış:{' '}
              {strVal(
                (climate.precipitation as Record<string, unknown> | undefined)?.annualTotalMm,
              )}{' '}
              mm · Ort. sıcaklık:{' '}
              {strVal((climate.temperature as Record<string, unknown> | undefined)?.annualMeanC)}°C
            </p>
          </div>
          <div>
            <h4>Toprak</h4>
            <p>Kaynak: {strVal(soil.source)}</p>
            <p>
              pH:{' '}
              {strVal(
                ((soil.properties as Record<string, unknown> | undefined)?.ph as
                  | Record<string, unknown>
                  | undefined)?.value,
              )}
              {' · '}
              Org. C:{' '}
              {strVal(
                ((soil.properties as Record<string, unknown> | undefined)?.organicCarbon as
                  | Record<string, unknown>
                  | undefined)?.value,
              )}
            </p>
          </div>
        </div>
          <p className="muted-copy" style={{ padding: '8px 0 0' }}>
            <Link
              to={`/tarim-ai?${summary.landId ? `landId=${encodeURIComponent(summary.landId)}&` : ''}analysisId=${encodeURIComponent(summary.analysisId)}`}
            >
              AI Destekli Analiz’de tam raporu aç
            </Link>
          </p>
      </section>
    </div>
  )
}
