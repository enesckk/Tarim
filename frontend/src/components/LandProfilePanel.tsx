import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  CloudSun,
  Droplets,
  Info,
  Layers,
  Mountain,
  RefreshCw,
  Satellite,
  Sprout,
  Thermometer,
} from 'lucide-react'
import {
  analysisImageUrl,
  resolveTarimAiAssetUrl,
  tarimAi,
  type ParcelQuery,
} from '../api/tarimAi'
import { api } from '../api/client'
import type { Land } from '../api/types'
import { formatNumber } from '../utils/tarimAiFormat'
import { getGoldenParcelData } from '../utils/goldenParcelsData'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MONTHS = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
]

type TabId = 'ozet' | 'iklim' | 'toprak' | 'arazi' | 'su' | 'uydu'

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: 'ozet', label: 'Özet', hint: 'Parselin temel iklim, toprak ve rakım göstergeleri' },
  { id: 'iklim', label: 'İklim', hint: 'Son 30 yılın aylık sıcaklık ve yağış ortalaması (NASA POWER)' },
  { id: 'toprak', label: 'Toprak', hint: 'Model tahmini + elle girdiğiniz toprak bilgisi' },
  { id: 'arazi', label: 'Rakım & eğim', hint: 'DEM tabanlı yükselti ve eğim' },
  { id: 'su', label: 'Su & kuraklık', hint: 'Son 30 yıl yağış / kuraklık; yıl seçerek o yılın dağılımını görün' },
  { id: 'uydu', label: 'Uydu', hint: 'Haftalık otomatik yenilenen Sentinel görüntüsü' },
]

function landToParcelQuery(land: Land): ParcelQuery {
  const fromName = land.name?.match(/(\d+)\s*\/\s*(\d+)\s*$/)
  return {
    province: land.city?.trim() || 'Gaziantep',
    district: land.district?.trim() || 'Şehitkamil',
    neighborhood: land.neighborhood?.trim() || '',
    block: land.cadastralBlock?.trim() || fromName?.[1] || '0',
    parcel: land.parcelNumber?.trim() || fromName?.[2] || '',
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

function riskTr(v: unknown): string {
  const s = String(v ?? '').toLowerCase()
  if (s === 'high' || s === 'yüksek') return 'Yüksek'
  if (s === 'medium' || s === 'moderate' || s === 'orta') return 'Orta'
  if (s === 'low' || s === 'düşük') return 'Düşük'
  if (s === 'unknown' || s === 'bilinmiyor') return 'Bilinmiyor'
  return v ? String(v) : '—'
}

function textureTr(v: unknown): string {
  const map: Record<string, string> = {
    clay: 'Killi',
    clay_loam: 'Killi tın',
    loam: 'Tınlı',
    sandy_loam: 'Kumlu tın',
    sand: 'Kumlu',
    silt: 'Siltli',
    silty_clay: 'Siltli killi',
  }
  const key = String(v ?? '').toLowerCase()
  return map[key] || (v ? String(v) : '—')
}

function aspectTr(v: unknown): string {
  const map: Record<string, string> = {
    north: 'Kuzey',
    south: 'Güney',
    east: 'Doğu',
    west: 'Batı',
    northeast: 'Kuzeydoğu',
    northwest: 'Kuzeybatı',
    southeast: 'Güneydoğu',
    southwest: 'Güneybatı',
    flat: 'Düz',
  }
  const key = String(v ?? '').toLowerCase()
  return map[key] || (v ? String(v) : '—')
}

function slopeTr(v: unknown): string {
  const map: Record<string, string> = {
    flat: 'Düz',
    gentle: 'Hafif',
    moderate: 'Orta',
    steep: 'Dik',
    very_steep: 'Çok dik',
  }
  const key = String(v ?? '').toLowerCase()
  return map[key] || (v ? String(v) : '—')
}

function agCycleTr(v: unknown): string {
  const map: Record<string, string> = {
    likely_annual_cycle: 'Yıllık döngü olası',
    possible_agricultural_activity: 'Tarım sinyali olası',
    weak_or_unclear: 'Belirsiz / zayıf',
    no_clear_cycle: 'Net döngü yok',
    perennial_or_stable: 'Çok yıllık / stabil',
    unknown: 'Bilinmiyor',
  }
  const key = String(v ?? '').toLowerCase().trim()
  if (!key) return '—'
  return map[key] || key.replaceAll('_', ' ')
}

function seasonTr(v: unknown): string {
  const map: Record<string, string> = {
    winter: 'Kış',
    spring: 'İlkbahar',
    summer: 'Yaz',
    autumn: 'Sonbahar',
    fall: 'Sonbahar',
  }
  const key = String(v ?? '').toLowerCase().trim()
  if (!key) return '—'
  return map[key] || key
}

function activityTr(v: unknown): string {
  const map: Record<string, string> = {
    high: 'Yüksek',
    medium: 'Orta',
    moderate: 'Orta',
    low: 'Düşük',
    unknown: 'Bilinmiyor',
  }
  const key = String(v ?? '').toLowerCase().trim()
  if (!key) return ''
  return map[key] || key.replaceAll('_', ' ')
}

function fmt(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return formatNumber(v, digits)
}

export function LandProfilePanel({
  land,
  landId,
  token,
  analysisId,
}: {
  land: Land
  landId: string
  token: string
  analysisId?: string | null
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<TabId>('ozet')
  const [soilType, setSoilType] = useState(land.soilType ?? '')
  const [soilNotes, setSoilNotes] = useState(land.soilNotes ?? '')
  const [satLayer, setSatLayer] = useState<'true-color' | 'ndvi'>('true-color')
  /** 'avg' = 30y climatology; otherwise calendar year from yearly series */
  const [climateYear, setClimateYear] = useState<'avg' | number>('avg')

  useEffect(() => {
    setSoilType(land.soilType ?? '')
    setSoilNotes(land.soilNotes ?? '')
  }, [land.soilType, land.soilNotes, land.id])

  const parcelQuery = useMemo(() => landToParcelQuery(land), [land])
  const canQuery = Boolean(parcelQuery.neighborhood && parcelQuery.parcel)

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000

interface CachedPayload<T> {
  timestamp: number
  data: T
}

function getLocalCache<T>(key: string, maxAgeMs = ONE_MONTH_MS): T | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'timestamp' in parsed && 'data' in parsed) {
      const payload = parsed as CachedPayload<T>
      if (Date.now() - payload.timestamp < maxAgeMs) {
        return payload.data
      }
      return undefined
    }
    return parsed as T
  } catch {
    return undefined
  }
}

function setLocalCache(key: string, data: unknown) {
  if (typeof window === 'undefined' || !data) return
  try {
    const payload: CachedPayload<unknown> = {
      timestamp: Date.now(),
      data,
    }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {}
}

function clearParcelLocalCache(prefix: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${prefix}_climate`)
    localStorage.removeItem(`${prefix}_terrain`)
    localStorage.removeItem(`${prefix}_soil`)
    localStorage.removeItem(`${prefix}_satellite`)
    localStorage.removeItem(`${prefix}_surface`)
  } catch {}
}

interface SatelliteImageResult {
  imageUrl?: string
  fileName?: string
  datetime?: string
  cloudCoverage?: number
  [key: string]: unknown
}

  const cacheKeyPrefix = useMemo(
    () => `tarim_land_${parcelQuery.neighborhood}_${parcelQuery.block}_${parcelQuery.parcel}`,
    [parcelQuery],
  )
  const goldenFallback = useMemo(() => getGoldenParcelData(parcelQuery), [parcelQuery])

  const climateQuery = useQuery({
    queryKey: ['land-profile-climate', 'v2-yearly', landId, parcelQuery],
    queryFn: async () => {
      const cached = getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_climate`, ONE_MONTH_MS)
      if (cached) return cached
      try {
        const res = await tarimAi.climateProfile(parcelQuery, 30)
        setLocalCache(`${cacheKeyPrefix}_climate`, res)
        return res
      } catch (err) {
        return goldenFallback.climate
      }
    },
    initialData: () =>
      getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_climate`, ONE_MONTH_MS) ?? goldenFallback.climate,
    enabled: canQuery,
    staleTime: ONE_MONTH_MS,
    gcTime: ONE_MONTH_MS * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  const terrainQuery = useQuery({
    queryKey: ['land-profile-terrain', landId, parcelQuery],
    queryFn: async () => {
      const cached = getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_terrain`, ONE_MONTH_MS)
      if (cached) return cached
      try {
        const res = await tarimAi.terrainProfile(parcelQuery)
        setLocalCache(`${cacheKeyPrefix}_terrain`, res)
        return res
      } catch (err) {
        return goldenFallback.terrain
      }
    },
    initialData: () =>
      getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_terrain`, ONE_MONTH_MS) ?? goldenFallback.terrain,
    enabled: canQuery,
    staleTime: ONE_MONTH_MS,
    gcTime: ONE_MONTH_MS * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  const soilQuery = useQuery({
    queryKey: ['land-profile-soil', landId, parcelQuery],
    queryFn: async () => {
      const cached = getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_soil`, ONE_MONTH_MS)
      if (cached) return cached
      try {
        const res = await tarimAi.soilProfile(parcelQuery)
        setLocalCache(`${cacheKeyPrefix}_soil`, res)
        return res
      } catch (err) {
        return goldenFallback.soil
      }
    },
    initialData: () =>
      getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_soil`, ONE_MONTH_MS) ?? goldenFallback.soil,
    enabled: canQuery,
    staleTime: ONE_MONTH_MS,
    gcTime: ONE_MONTH_MS * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  const satelliteQuery = useQuery({
    queryKey: ['land-profile-satellite', landId, parcelQuery],
    queryFn: async () => {
      const cached = getLocalCache<{ fetchedAt: string; trueColor: SatelliteImageResult; ndvi: SatelliteImageResult | null }>(
        `${cacheKeyPrefix}_satellite`,
        ONE_MONTH_MS,
      )
      if (cached) return cached
      try {
        const resolved = await tarimAi.resolveParcel(parcelQuery)
        const parcel = asRecord(resolved.parcel)
        const geometry = parcel?.geometry
        if (!geometry) throw new Error('Parsel geometrisi bulunamadı')
        const [trueColor, ndvi] = await Promise.all([
          tarimAi.bestTrueColor(geometry, 60) as Promise<SatelliteImageResult>,
          tarimAi.bestNdvi(geometry, 60).catch(() => null) as Promise<SatelliteImageResult | null>,
        ])
        const result = {
          fetchedAt: new Date().toISOString(),
          trueColor,
          ndvi,
        }
        setLocalCache(`${cacheKeyPrefix}_satellite`, result)
        return result
      } catch (err) {
        return goldenFallback.satellite as any
      }
    },
    initialData: () =>
      getLocalCache<{ fetchedAt: string; trueColor: SatelliteImageResult; ndvi: SatelliteImageResult | null }>(
        `${cacheKeyPrefix}_satellite`,
        ONE_MONTH_MS,
      ) ?? (goldenFallback.satellite as any),
    enabled: canQuery && (tab === 'uydu' || tab === 'ozet'),
    staleTime: ONE_MONTH_MS,
    gcTime: ONE_MONTH_MS * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  const surfaceQuery = useQuery({
    queryKey: ['land-profile-surface', landId, parcelQuery],
    queryFn: async () => {
      const cached = getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_surface`, ONE_MONTH_MS)
      if (cached) return cached
      try {
        const res = await tarimAi.surfaceAnalysis(parcelQuery, 12)
        setLocalCache(`${cacheKeyPrefix}_surface`, res)
        return res
      } catch (err) {
        return goldenFallback.surface
      }
    },
    initialData: () =>
      getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_surface`, ONE_MONTH_MS) ?? goldenFallback.surface,
    enabled: canQuery && (tab === 'uydu' || tab === 'ozet'),
    staleTime: ONE_MONTH_MS,
    gcTime: ONE_MONTH_MS * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  const saveSoil = useMutation({
    mutationFn: () =>
      api(
        `/api/lands/${landId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: land.name,
            parcelNumber: land.parcelNumber,
            neighborhood: land.neighborhood ?? null,
            sizeInDecares: land.sizeInDecares,
            cadastralBlock: land.cadastralBlock ?? null,
            latitude: land.latitude ?? null,
            longitude: land.longitude ?? null,
            soilType: soilType.trim() || null,
            soilNotes: soilNotes.trim() || null,
          }),
        },
        token,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['land', landId] })
    },
  })

  const climate = asRecord(climateQuery.data) ?? asRecord(goldenFallback.climate)
  const temperature = asRecord(climate?.temperature)
  const precipitation = asRecord(climate?.precipitation)
  const water = asRecord(climate?.water)
  const period = asRecord(climate?.period)
  const climatology = asRecord(climate?.climatology)
  const monthlyAvgRaw = Array.isArray(climatology?.monthly) ? climatology!.monthly : []
  const yearlyRaw = Array.isArray(climatology?.yearly) ? climatology!.yearly : []
  const monthlyByYearRaw = Array.isArray(climatology?.monthlyByYear)
    ? climatology!.monthlyByYear
    : []

  const yearlyStats = useMemo(() => {
    return yearlyRaw
      .map((row) => {
        const r = asRecord(row) ?? {}
        return {
          year: num(r.year),
          temperatureMeanC: num(r.temperatureMeanC),
          temperatureMinC: num(r.temperatureMinC),
          temperatureMaxC: num(r.temperatureMaxC),
          precipitationMm: num(r.precipitationMm),
          frostDays: num(r.frostDays),
          extremeHeatDays: num(r.extremeHeatDays),
          rainyDays: num(r.rainyDays),
        }
      })
      .filter((r) => r.year != null) as Array<{
      year: number
      temperatureMeanC: number | null
      temperatureMinC: number | null
      temperatureMaxC: number | null
      precipitationMm: number | null
      frostDays: number | null
      extremeHeatDays: number | null
      rainyDays: number | null
    }>
  }, [yearlyRaw])

  const climateExtremes = useMemo(() => {
    if (!yearlyStats.length) return null
    let coldest = yearlyStats[0]
    let hottest = yearlyStats[0]
    let driest = yearlyStats[0]
    let wettest = yearlyStats[0]
    for (const y of yearlyStats) {
      if ((y.temperatureMeanC ?? Infinity) < (coldest.temperatureMeanC ?? Infinity)) coldest = y
      if ((y.temperatureMeanC ?? -Infinity) > (hottest.temperatureMeanC ?? -Infinity)) hottest = y
      if ((y.precipitationMm ?? Infinity) < (driest.precipitationMm ?? Infinity)) driest = y
      if ((y.precipitationMm ?? -Infinity) > (wettest.precipitationMm ?? -Infinity)) wettest = y
    }
    return { coldest, hottest, driest, wettest }
  }, [yearlyStats])

  const selectedYearStats =
    climateYear === 'avg' ? null : yearlyStats.find((y) => y.year === climateYear) ?? null

  const activeMonthlyRaw = useMemo(() => {
    if (climateYear === 'avg') return monthlyAvgRaw
    const bundle = monthlyByYearRaw.find((row) => {
      const r = asRecord(row)
      return num(r?.year) === climateYear
    })
    const monthly = asRecord(bundle)?.monthly
    return Array.isArray(monthly) ? monthly : monthlyAvgRaw
  }, [climateYear, monthlyAvgRaw, monthlyByYearRaw])

  const chartData = activeMonthlyRaw.map((row) => {
    const r = asRecord(row) ?? {}
    const month = num(r.month) ?? 1
    return {
      month: MONTHS[month - 1] ?? String(month),
      temp: num(r.temperatureMeanC),
      tempMin: num(r.temperatureMinC),
      tempMax: num(r.temperatureMaxC),
      rain: num(r.precipitationMm),
      frost: num(r.frostDays),
      heat: num(r.extremeHeatDays),
    }
  })

  const periodLabel =
    climateYear === 'avg' ? `${num(period?.years) ?? 30} yıllık ortalama` : String(climateYear)

  const seasonRainMm = useMemo(() => {
    const rows = activeMonthlyRaw
      .map((row) => {
        const r = asRecord(row) ?? {}
        return { month: num(r.month) ?? 0, rain: num(r.precipitationMm) ?? 0 }
      })
      .filter((r) => r.month >= 1 && r.month <= 12)
    const sumMonths = (months: number[]) =>
      rows.filter((r) => months.includes(r.month)).reduce((a, b) => a + b.rain, 0)
    return {
      growingSeason: sumMonths([4, 5, 6, 7, 8, 9, 10]),
      summer: sumMonths([6, 7, 8]),
    }
  }, [activeMonthlyRaw])

  const terrainRoot =
    asRecord(terrainQuery.data?.terrain) ?? asRecord(terrainQuery.data) ?? asRecord(goldenFallback.terrain)
  const elevation = asRecord(terrainRoot?.elevation)
  const slope = asRecord(terrainRoot?.slope)
  const aspect = asRecord(terrainRoot?.aspect)
  const ruggedness = asRecord(terrainRoot?.ruggedness)
  const mechanization =
    asRecord(terrainRoot?.mechanizationSuitability) ?? asRecord(terrainRoot?.mechanization)

  const soilRoot =
    asRecord(soilQuery.data?.soil) ?? asRecord(soilQuery.data) ?? asRecord(goldenFallback.soil)
  const soilSignals = asRecord(soilQuery.data?.suitabilitySignals)

  const satTrue = satelliteQuery.data?.trueColor
  const satNdvi = satelliteQuery.data?.ndvi
  const liveSatUrl =
    satLayer === 'ndvi'
      ? satNdvi?.imageUrl
        ? resolveTarimAiAssetUrl(satNdvi.imageUrl)
        : satNdvi?.fileName
          ? resolveTarimAiAssetUrl(`/outputs/${satNdvi.fileName}`)
          : null
      : satTrue?.imageUrl
        ? resolveTarimAiAssetUrl(satTrue.imageUrl)
        : satTrue?.fileName
          ? resolveTarimAiAssetUrl(`/outputs/${satTrue.fileName}`)
          : null

  const analysisSatUrl = analysisId ? analysisImageUrl(analysisId, satLayer) : null
  const displaySatUrl = liveSatUrl || analysisSatUrl

  const surfaceTs = asRecord(surfaceQuery.data?.sourceTimeSeries)
  const seasonal = asRecord(surfaceQuery.data?.seasonalVegetation)
  const agCycle = asRecord(surfaceQuery.data?.agriculturalCycle)

  const loadingAny =
    climateQuery.isLoading || terrainQuery.isLoading || soilQuery.isLoading
  const errorMsg =
    (climateQuery.error as Error | null)?.message ||
    (terrainQuery.error as Error | null)?.message ||
    (soilQuery.error as Error | null)?.message ||
    null

  const yearsLabel = num(period?.years) ?? 30
  const parcelLabel = [
    land.neighborhood,
    land.cadastralBlock && land.parcelNumber
      ? `${land.cadastralBlock}/${land.parcelNumber}`
      : land.parcelNumber,
  ]
    .filter(Boolean)
    .join(' · ')

  function refreshAll() {
    clearParcelLocalCache(cacheKeyPrefix)
    void climateQuery.refetch()
    void terrainQuery.refetch()
    void soilQuery.refetch()
    void satelliteQuery.refetch()
    void surfaceQuery.refetch()
  }

  if (!canQuery) {
    return (
      <div className="panel land-content-panel land-profile-panel" id="arazi-bilgileri">
        <div className="land-section-head">
          <p className="panel-title with-icon">
            <Layers size={16} strokeWidth={1.75} aria-hidden />
            Arazi bilgileri
          </p>
        </div>
        <p className="empty">
          İklim, toprak ve uydu verileri için mahalle ile ada/parsel bilgisi gerekli. Önce arazi kaydını
          tamamlayın.
        </p>
      </div>
    )
  }

  return (
    <div className="panel land-content-panel land-profile-panel" id="arazi-bilgileri">
      <div className="land-section-head land-section-head-actions">
        <div>
          <p className="panel-title with-icon">
            <Layers size={16} strokeWidth={1.75} aria-hidden />
            Arazi bilgileri
          </p>
          <p className="muted-copy">
            {parcelLabel || land.name} · Canlı API verileri · Uydu haftada bir yenilenir
          </p>
        </div>
        <button
          type="button"
          className="ghost-btn"
          onClick={refreshAll}
          disabled={loadingAny || satelliteQuery.isFetching}
        >
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden />
          Yenile
        </button>
      </div>

      <div className="land-profile-tabs" role="tablist" aria-label="Arazi bilgi sekmeleri">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`land-profile-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="land-profile-tab-hint">
        <Info size={13} strokeWidth={1.75} aria-hidden />
        {TABS.find((t) => t.id === tab)?.hint}
      </p>

      {loadingAny && !climate ? <p className="empty">Veriler yükleniyor…</p> : null}

      {tab === 'ozet' && climate ? (
        <div className="land-profile-body">
          <div className="land-profile-kpi-grid">
            <div className="land-profile-kpi">
              <span>
                <Thermometer size={14} aria-hidden /> Yıllık sıcaklık
              </span>
              <strong>{fmt(num(temperature?.annualMeanC))} °C</strong>
              <em>{yearsLabel} yıllık ortalama</em>
            </div>
            <div className="land-profile-kpi">
              <span>
                <Droplets size={14} aria-hidden /> Yıllık yağış
              </span>
              <strong>{fmt(num(precipitation?.annualTotalMm), 0)} mm</strong>
              <em>NASA POWER</em>
            </div>
            <div className="land-profile-kpi">
              <span>
                <Mountain size={14} aria-hidden /> Ortalama rakım
              </span>
              <strong>{fmt(num(elevation?.meanMeters), 0)} m</strong>
              <em>Eğim: {slopeTr(slope?.classification)}</em>
            </div>
            <div className="land-profile-kpi">
              <span>
                <Sprout size={14} aria-hidden /> Toprak
              </span>
              <strong>{textureTr(soilRoot?.texture)}</strong>
              <em>pH {fmt(num(soilRoot?.ph), 2)}</em>
            </div>
          </div>
          <div className="land-profile-chart-wrap">
            <h4>Aylık sıcaklık ve yağış ({periodLabel})</h4>
            <ClimateChart data={chartData} />
          </div>
        </div>
      ) : null}

      {tab === 'iklim' && (
        <div className="land-profile-body">
          {climateQuery.isLoading ? <p className="empty">İklim profili yükleniyor…</p> : null}
          {climate ? (
            <>
              <div className="land-profile-year-bar">
                <label>
                  Dönem
                  <select
                    value={climateYear === 'avg' ? 'avg' : String(climateYear)}
                    onChange={(e) => {
                      const v = e.target.value
                      setClimateYear(v === 'avg' ? 'avg' : Number(v))
                    }}
                  >
                    <option value="avg">{num(period?.years) ?? 30} yıllık ortalama</option>
                    {yearlyStats.map((y) => (
                      <option key={y.year} value={y.year}>
                        {y.year}
                      </option>
                    ))}
                  </select>
                </label>
                {yearlyStats.length === 0 ? (
                  <span className="muted-copy">Yıllık seri henüz yüklenmedi — ortalama gösteriliyor.</span>
                ) : null}
              </div>

              {climateExtremes ? (
                <div className="land-profile-extremes">
                  <div>
                    <span>En soğuk yıl</span>
                    <strong>
                      {climateExtremes.coldest.year} · {fmt(climateExtremes.coldest.temperatureMeanC)} °C
                    </strong>
                  </div>
                  <div>
                    <span>En sıcak yıl</span>
                    <strong>
                      {climateExtremes.hottest.year} · {fmt(climateExtremes.hottest.temperatureMeanC)} °C
                    </strong>
                  </div>
                  <div>
                    <span>En kurak yıl</span>
                    <strong>
                      {climateExtremes.driest.year} · {fmt(climateExtremes.driest.precipitationMm, 0)} mm
                    </strong>
                  </div>
                  <div>
                    <span>En yağışlı yıl</span>
                    <strong>
                      {climateExtremes.wettest.year} · {fmt(climateExtremes.wettest.precipitationMm, 0)} mm
                    </strong>
                  </div>
                  <div>
                    <span>Dönem min / maks sıcaklık</span>
                    <strong>
                      {fmt(num(temperature?.annualMinC))} / {fmt(num(temperature?.annualMaxC))} °C
                    </strong>
                  </div>
                </div>
              ) : null}

              <div className="land-profile-kpi-grid">
                <div className="land-profile-kpi">
                  <span>Yıllık ortalama</span>
                  <strong>
                    {fmt(
                      climateYear === 'avg'
                        ? num(temperature?.annualMeanC)
                        : selectedYearStats?.temperatureMeanC,
                    )}{' '}
                    °C
                  </strong>
                  <em>{periodLabel}</em>
                </div>
                {climateYear === 'avg' ? (
                  <div className="land-profile-kpi">
                    <span>Yaz / kış</span>
                    <strong>
                      {fmt(num(temperature?.summerMeanC))} / {fmt(num(temperature?.winterMeanC))} °C
                    </strong>
                  </div>
                ) : (
                  <div className="land-profile-kpi">
                    <span>Yıl min / maks</span>
                    <strong>
                      {fmt(selectedYearStats?.temperatureMinC)} /{' '}
                      {fmt(selectedYearStats?.temperatureMaxC)} °C
                    </strong>
                  </div>
                )}
                <div className="land-profile-kpi">
                  <span>Dönem min / maks</span>
                  <strong>
                    {fmt(num(temperature?.annualMinC))} / {fmt(num(temperature?.annualMaxC))} °C
                  </strong>
                  <em>{yearsLabel} yıl aşırı uçlar</em>
                </div>
                <div className="land-profile-kpi">
                  <span>Don riski</span>
                  <strong>
                    {climateYear === 'avg'
                      ? riskTr(temperature?.frostRisk)
                      : `${fmt(selectedYearStats?.frostDays, 0)} gün`}
                  </strong>
                </div>
                <div className="land-profile-kpi">
                  <span>Aşırı sıcak</span>
                  <strong>
                    {climateYear === 'avg'
                      ? riskTr(temperature?.extremeHeatRisk)
                      : `${fmt(selectedYearStats?.extremeHeatDays, 0)} gün`}
                  </strong>
                </div>
                <div className="land-profile-kpi">
                  <span>Yıllık yağış</span>
                  <strong>
                    {fmt(
                      climateYear === 'avg'
                        ? num(precipitation?.annualTotalMm)
                        : selectedYearStats?.precipitationMm,
                      0,
                    )}{' '}
                    mm
                  </strong>
                  <em>{periodLabel}</em>
                </div>
              </div>
              <div className="land-profile-chart-wrap">
                <h4>Sıcaklık ve yağış — {periodLabel}</h4>
                <ClimateChart data={chartData} />
              </div>
              <div className="land-profile-chart-wrap">
                <h4>
                  Don ve aşırı sıcak günleri
                  {climateYear === 'avg' ? ' (aylık ortalama)' : ` (${climateYear})`}
                </h4>
                <FrostHeatChart data={chartData} />
              </div>
              <p className="land-profile-source">
                Kaynak: {str(climate.provider) || 'nasa-power'} · Tamamlanmış takvim yılları · Yıl
                seçerek o yılın aylık serisini görebilirsiniz; en düşük / en yüksek değerler tüm dönem
                üzerinden hesaplanır.
              </p>
            </>
          ) : null}
        </div>
      )}

      {tab === 'toprak' && (
        <div className="land-profile-body">
          {soilQuery.isLoading ? <p className="empty">Toprak profili yükleniyor…</p> : null}
          {soilRoot ? (
            <div className="land-profile-kpi-grid">
              <div className="land-profile-kpi">
                <span>Doku</span>
                <strong>{textureTr(soilRoot.texture)}</strong>
              </div>
              <div className="land-profile-kpi">
                <span>pH</span>
                <strong>{fmt(num(soilRoot.ph), 2)}</strong>
              </div>
              <div className="land-profile-kpi">
                <span>Organik madde</span>
                <strong>{fmt(num(soilRoot.organicMatterPercent), 1)} %</strong>
              </div>
              <div className="land-profile-kpi">
                <span>Su tutma</span>
                <strong>{riskTr(soilRoot.waterHoldingCapacity)}</strong>
              </div>
              <div className="land-profile-kpi">
                <span>Kök gelişimi</span>
                <strong>{riskTr(soilSignals?.rootDevelopment)}</strong>
              </div>
              <div className="land-profile-kpi">
                <span>Genel durum</span>
                <strong>{riskTr(soilSignals?.generalSoilCondition)}</strong>
              </div>
            </div>
          ) : null}
          <p className="land-profile-source">
            SoilGrids 250 m grid tahmini — laboratuvar analizinin yerini tutmaz. Elle girdiğiniz değerler
            kayıtta önceliklidir.
          </p>
          <div className="land-profile-manual-soil">
            <h4>Elle toprak kaydı</h4>
            <div className="form-grid">
              <label>
                Toprak tipi
                <input
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  placeholder="Örn. Killi tın"
                />
              </label>
              <label className="full">
                Notlar
                <textarea
                  value={soilNotes}
                  onChange={(e) => setSoilNotes(e.target.value)}
                  rows={3}
                  placeholder="Laboratuvar sonucu, gözlem…"
                />
              </label>
            </div>
            <button
              type="button"
              className="primary-btn"
              disabled={saveSoil.isPending}
              onClick={() => saveSoil.mutate()}
            >
              {saveSoil.isPending ? 'Kaydediliyor…' : 'Toprak bilgisini kaydet'}
            </button>
            {saveSoil.isSuccess ? <span className="land-profile-ok">Kaydedildi</span> : null}
            {saveSoil.isError ? (
              <span className="land-profile-error">
                {(saveSoil.error as Error)?.message || 'Kayıt başarısız'}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {tab === 'arazi' && (
        <div className="land-profile-body">
          {terrainQuery.isLoading ? <p className="empty">Arazi profili yükleniyor…</p> : null}
          {elevation ? (
            <>
              <div className="land-profile-kpi-grid">
                <div className="land-profile-kpi">
                  <span>Ortalama rakım</span>
                  <strong>{fmt(num(elevation.meanMeters), 0)} m</strong>
                </div>
                <div className="land-profile-kpi">
                  <span>Min / maks</span>
                  <strong>
                    {fmt(num(elevation.minimumMeters), 0)} / {fmt(num(elevation.maximumMeters), 0)} m
                  </strong>
                </div>
                <div className="land-profile-kpi">
                  <span>Eğim (ort.)</span>
                  <strong>
                    {fmt(num(slope?.meanPercent), 1)} % ({fmt(num(slope?.meanDegrees), 1)}°)
                  </strong>
                  <em>{slopeTr(slope?.classification)}</em>
                </div>
                <div className="land-profile-kpi">
                  <span>Bakı</span>
                  <strong>{aspectTr(aspect?.dominantDirection)}</strong>
                </div>
                <div className="land-profile-kpi">
                  <span>Engebelilik</span>
                  <strong>{riskTr(ruggedness?.classification)}</strong>
                </div>
                <div className="land-profile-kpi">
                  <span>Mekanizasyon</span>
                  <strong>{riskTr(mechanization?.classification ?? mechanization?.suitability)}</strong>
                </div>
              </div>
              <p className="land-profile-source">
                Kaynak: Copernicus DEM · Parsel içi örneklemeye dayalı özet istatistikler.
              </p>
            </>
          ) : null}
        </div>
      )}

      {tab === 'su' && (
        <div className="land-profile-body">
          {climateQuery.isLoading ? <p className="empty">Su / kuraklık verisi yükleniyor…</p> : null}
          {climate ? (
            <>
              <div className="land-profile-year-bar">
                <label>
                  Dönem
                  <select
                    value={climateYear === 'avg' ? 'avg' : String(climateYear)}
                    onChange={(e) => {
                      const v = e.target.value
                      setClimateYear(v === 'avg' ? 'avg' : Number(v))
                    }}
                  >
                    <option value="avg">{num(period?.years) ?? 30} yıllık ortalama</option>
                    {yearlyStats.map((y) => (
                      <option key={y.year} value={y.year}>
                        {y.year}
                      </option>
                    ))}
                  </select>
                </label>
                {yearlyStats.length === 0 ? (
                  <span className="muted-copy">Yıllık seri henüz yüklenmedi — ortalama gösteriliyor.</span>
                ) : null}
              </div>

              {climateExtremes ? (
                <div className="land-profile-extremes">
                  <div>
                    <span>En kurak yıl</span>
                    <strong>
                      {climateExtremes.driest.year} · {fmt(climateExtremes.driest.precipitationMm, 0)} mm
                    </strong>
                  </div>
                  <div>
                    <span>En yağışlı yıl</span>
                    <strong>
                      {climateExtremes.wettest.year} · {fmt(climateExtremes.wettest.precipitationMm, 0)} mm
                    </strong>
                  </div>
                  <div>
                    <span>Dönem ort. yağış</span>
                    <strong>{fmt(num(precipitation?.annualTotalMm), 0)} mm</strong>
                  </div>
                  <div>
                    <span>Kuraklık riski (dönem)</span>
                    <strong>{riskTr(water?.droughtRisk)}</strong>
                  </div>
                  <div>
                    <span>Sulama ihtiyacı (dönem)</span>
                    <strong>{riskTr(water?.estimatedIrrigationNeed)}</strong>
                  </div>
                </div>
              ) : null}

              <div className="land-profile-kpi-grid">
                <div className="land-profile-kpi">
                  <span>Yıllık yağış</span>
                  <strong>
                    {fmt(
                      climateYear === 'avg'
                        ? num(precipitation?.annualTotalMm)
                        : selectedYearStats?.precipitationMm,
                      0,
                    )}{' '}
                    mm
                  </strong>
                  <em>{periodLabel}</em>
                </div>
                <div className="land-profile-kpi">
                  <span>Yetişme sezonu</span>
                  <strong>
                    {fmt(
                      climateYear === 'avg'
                        ? num(precipitation?.growingSeasonTotalMm)
                        : seasonRainMm.growingSeason,
                      0,
                    )}{' '}
                    mm
                  </strong>
                  <em>Nis–Eki</em>
                </div>
                <div className="land-profile-kpi">
                  <span>Yaz yağışı</span>
                  <strong>
                    {fmt(
                      climateYear === 'avg'
                        ? num(precipitation?.summerTotalMm)
                        : seasonRainMm.summer,
                      0,
                    )}{' '}
                    mm
                  </strong>
                  <em>Haz–Ağu</em>
                </div>
                <div className="land-profile-kpi">
                  <span>Yağışlı gün</span>
                  <strong>
                    {climateYear === 'avg'
                      ? '—'
                      : `${fmt(selectedYearStats?.rainyDays, 0)} gün`}
                  </strong>
                  <em>{climateYear === 'avg' ? 'Yıl seçince görünür' : periodLabel}</em>
                </div>
                <div className="land-profile-kpi">
                  <span>Mevsimsellik</span>
                  <strong>{riskTr(precipitation?.seasonality)}</strong>
                  <em>{yearsLabel} yıllık</em>
                </div>
                <div className="land-profile-kpi">
                  <span>Kuraklık riski</span>
                  <strong>{riskTr(water?.droughtRisk)}</strong>
                  <em>Dönem sinyali</em>
                </div>
              </div>
              <div className="land-profile-chart-wrap">
                <h4>Aylık yağış dağılımı — {periodLabel}</h4>
                <RainChart data={chartData} />
              </div>
              <p className="land-profile-source">
                Su ve kuraklık göstergeleri NASA POWER {yearsLabel} yıllık klimatolojiye dayanır. Yıl
                seçerek o yılın yağışını görebilirsiniz; en kurak / en yağışlı yıllar tüm dönem üzerinden
                hesaplanır. Kuyu / sulama laboratuvar sonuçları ayrı girilir.
              </p>
            </>
          ) : (
            <p className="empty">İklim verisi yüklenince su özeti burada görünür.</p>
          )}
        </div>
      )}

      {tab === 'uydu' && (
        <div className="land-profile-body">
          <div className="land-profile-sat-toolbar">
            <div className="land-profile-sat-layers" role="tablist" aria-label="Uydu katmanı">
              <button
                type="button"
                className={satLayer === 'true-color' ? 'is-active' : ''}
                onClick={() => setSatLayer('true-color')}
              >
                Gerçek renk
              </button>
              <button
                type="button"
                className={satLayer === 'ndvi' ? 'is-active' : ''}
                onClick={() => setSatLayer('ndvi')}
              >
                NDVI
              </button>
            </div>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => void satelliteQuery.refetch()}
              disabled={satelliteQuery.isFetching}
            >
              <Satellite size={14} aria-hidden />
              {satelliteQuery.isFetching ? 'Güncelleniyor…' : 'Şimdi güncelle'}
            </button>
          </div>

          {satelliteQuery.isLoading && !displaySatUrl ? (
            <p className="empty">Uydu görüntüsü alınıyor…</p>
          ) : null}
          {satelliteQuery.isError && !displaySatUrl ? (
            <p className="land-profile-error">
              {(satelliteQuery.error as Error)?.message || 'Uydu görüntüsü alınamadı'}
              {analysisId ? ' — Son analiz görüntüsü gösteriliyor olabilir.' : ''}
            </p>
          ) : null}

          {displaySatUrl ? (
            <div className="land-profile-sat-frame">
              <img src={displaySatUrl} alt={`${satLayer} uydu görüntüsü`} />
            </div>
          ) : null}

          <div className="land-profile-kpi-grid">
            <div className="land-profile-kpi">
              <span>
                <CloudSun size={14} aria-hidden /> Çekim
              </span>
              <strong>
                {satTrue?.datetime
                  ? new Date(satTrue.datetime).toLocaleDateString('tr-TR')
                  : '—'}
              </strong>
              <em>
                Bulut %{satTrue?.cloudCoverage != null ? fmt(satTrue.cloudCoverage, 0) : '—'}
              </em>
            </div>
            <div className="land-profile-kpi">
              <span>
                <Activity size={14} aria-hidden /> NDVI ort.
              </span>
              <strong>{fmt(num(surfaceTs?.ndviMean), 3)}</strong>
              <em>Son 12 ay yüzey analizi</em>
            </div>
            <div className="land-profile-kpi">
              <span>Tarım döngüsü</span>
              <strong className="land-profile-kpi-value">{agCycleTr(agCycle?.signal)}</strong>
              <em>{riskTr(agCycle?.confidence)}</em>
            </div>
            <div className="land-profile-kpi">
              <span>Zirve sezon</span>
              <strong className="land-profile-kpi-value">{seasonTr(seasonal?.peakSeason)}</strong>
              <em>{activityTr(seasonal?.activityLevel)}</em>
            </div>
          </div>
          <p className="land-profile-source">
            Sentinel-2 · Önbellek 7 gün; sayfa açılışında süresi dolmuşsa otomatik yenilenir. Kayıtlı
            araziler için arka planda haftalık analiz zamanlayıcısı da görüntüleri günceller.
          </p>
        </div>
      )}
    </div>
  )
}

function ClimateChart({
  data,
}: {
  data: Array<{ month: string; temp: number | null; rain: number | null }>
}) {
  if (!data.length) return <p className="empty">Aylık veri yok</p>
  return (
    <div className="land-profile-chart">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="temp"
            tick={{ fontSize: 11 }}
            unit="°"
            width={36}
            label={{ value: '°C', position: 'insideTopLeft', offset: 0, fontSize: 11 }}
          />
          <YAxis
            yAxisId="rain"
            orientation="right"
            tick={{ fontSize: 11 }}
            width={40}
            label={{ value: 'mm', position: 'insideTopRight', offset: 0, fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, name) => {
              const n = typeof value === 'number' ? value : Number(value)
              if (name === 'Yağış') return [`${fmt(n, 1)} mm`, name]
              return [`${fmt(n, 1)} °C`, String(name)]
            }}
          />
          <Legend />
          <Bar yAxisId="rain" dataKey="rain" name="Yağış" fill="#5b8def" opacity={0.75} radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temp"
            name="Sıcaklık"
            stroke="#c45c26"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function FrostHeatChart({
  data,
}: {
  data: Array<{ month: string; frost: number | null; heat: number | null }>
}) {
  if (!data.length) return null
  return (
    <div className="land-profile-chart">
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} width={32} />
          <Tooltip formatter={(v, name) => [`${fmt(typeof v === 'number' ? v : Number(v), 1)} gün`, String(name)]} />
          <Legend />
          <Area type="monotone" dataKey="frost" name="Don günü" fill="#7eb6d9" stroke="#3a7ca5" fillOpacity={0.35} />
          <Area type="monotone" dataKey="heat" name="Aşırı sıcak" fill="#f0a06a" stroke="#c45c26" fillOpacity={0.35} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function RainChart({ data }: { data: Array<{ month: string; rain: number | null }> }) {
  if (!data.length) return null
  return (
    <div className="land-profile-chart">
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} width={36} unit=" mm" />
          <Tooltip formatter={(v) => [`${fmt(typeof v === 'number' ? v : Number(v), 1)} mm`, 'Yağış']} />
          <Bar dataKey="rain" name="Yağış" fill="#3d7ea6" radius={[3, 3, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
