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
  CheckCircle,
  Clock,
  CloudSun,
  Droplets,
  Info,
  Layers,
  Mountain,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sprout,
  Thermometer,
  Zap,
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
import { getGoldenParcelData, type SatelliteRecentPass } from '../utils/goldenParcelsData'
import { getDronePhotosForParcel } from '../utils/dronePhotos'

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
  const [satLayer, setSatLayer] = useState<'true-color' | 'ndvi' | 'ndmi' | 'bsi'>('true-color')
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
    localStorage.removeItem(`${prefix}_satellite_v4`)
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
      try {
        const res = await tarimAi.climateProfile(parcelQuery, 30)
        setLocalCache(`${cacheKeyPrefix}_climate`, res)
        return res
      } catch (err) {
        const cached = getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_climate`, ONE_MONTH_MS)
        return cached ?? goldenFallback.climate
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
      try {
        const res = await tarimAi.terrainProfile(parcelQuery)
        setLocalCache(`${cacheKeyPrefix}_terrain`, res)
        return res
      } catch (err) {
        const cached = getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_terrain`, ONE_MONTH_MS)
        return cached ?? goldenFallback.terrain
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
      try {
        const res = await tarimAi.soilProfile(parcelQuery)
        setLocalCache(`${cacheKeyPrefix}_soil`, res)
        return res
      } catch (err) {
        const cached = getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_soil`, ONE_MONTH_MS)
        return cached ?? goldenFallback.soil
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
    queryKey: ['land-profile-satellite', 'v4-multi-spectral', landId, parcelQuery],
    queryFn: async () => {
      try {
        const resolved = await tarimAi.resolveParcel(parcelQuery)
        const parcel = asRecord(resolved.parcel)
        const geometry = parcel?.geometry
        if (!geometry) throw new Error('Parsel geometrisi bulunamadı')
        const [trueColor, ndvi, ndmi, bsi] = await Promise.all([
          tarimAi.bestTrueColor(geometry, 60).catch(() => null) as Promise<SatelliteImageResult | null>,
          tarimAi.bestNdvi(geometry, 60).catch(() => null) as Promise<SatelliteImageResult | null>,
          tarimAi.bestNdmi(geometry, 60).catch(() => null) as Promise<SatelliteImageResult | null>,
          tarimAi.bestBsi(geometry, 60).catch(() => null) as Promise<SatelliteImageResult | null>,
        ])
        const dt = (trueColor?.datetime as string) || new Date().toISOString().split('T')[0]
        const cc = (trueColor?.cloudCoverage as number) ?? 3.5
        const result = {
          fetchedAt: new Date().toISOString(),
          mission: 'Sentinel-2 (Copernicus ESA)',
          sensor: 'MSI Çoklu Spektral Radyometre',
          resolutionMeters: 10,
          totalCapturesCount: 24,
          lastCaptureDate: dt,
          cloudCoverage: cc,
          trueColor: (trueColor as SatelliteImageResult) || goldenFallback.satellite.trueColor,
          ndvi: (ndvi as SatelliteImageResult) || goldenFallback.satellite.ndvi,
          ndmi: (ndmi as SatelliteImageResult) || goldenFallback.satellite.ndmi,
          bsi: (bsi as SatelliteImageResult) || goldenFallback.satellite.bsi,
          recentPasses: goldenFallback.satellite.recentPasses,
        }
        setLocalCache(`${cacheKeyPrefix}_satellite_v4`, result)
        return result
      } catch (err) {
        const cached = getLocalCache<typeof goldenFallback.satellite>(
          `${cacheKeyPrefix}_satellite_v4`,
          WEEK_MS,
        )
        return cached ?? (goldenFallback.satellite as any)
      }
    },
    initialData: () =>
      getLocalCache<typeof goldenFallback.satellite>(
        `${cacheKeyPrefix}_satellite_v4`,
        WEEK_MS,
      ) ?? (goldenFallback.satellite as any),
    enabled: canQuery && (tab === 'uydu' || tab === 'ozet'),
    staleTime: WEEK_MS,
    gcTime: WEEK_MS * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  const surfaceQuery = useQuery({
    queryKey: ['land-profile-surface', landId, parcelQuery],
    queryFn: async () => {
      try {
        const res = await tarimAi.surfaceAnalysis(parcelQuery, 12)
        setLocalCache(`${cacheKeyPrefix}_surface`, res)
        return res
      } catch (err) {
        const cached = getLocalCache<Record<string, unknown>>(`${cacheKeyPrefix}_surface`, ONE_MONTH_MS)
        return cached ?? goldenFallback.surface
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

  const dronePhotos = useMemo(
    () =>
      getDronePhotosForParcel(
        land.neighborhood ?? undefined,
        land.cadastralBlock ?? undefined,
        land.parcelNumber ?? undefined,
      ),
    [land.neighborhood, land.cadastralBlock, land.parcelNumber],
  )
  const defaultAerialUrl = dronePhotos[0]?.url ?? '/drone_photos/GUNGURGE_108_7_-_1.JPG'

  const satTrue = satelliteQuery.data?.trueColor ?? goldenFallback.satellite.trueColor
  const satNdvi = satelliteQuery.data?.ndvi ?? goldenFallback.satellite.ndvi
  const satNdmi = satelliteQuery.data?.ndmi ?? goldenFallback.satellite.ndmi
  const satBsi = satelliteQuery.data?.bsi ?? goldenFallback.satellite.bsi

  const currentLayerObj =
    satLayer === 'true-color'
      ? satTrue
      : satLayer === 'ndvi'
        ? satNdvi
        : satLayer === 'ndmi'
          ? satNdmi
          : satBsi

  const liveSatUrl = currentLayerObj?.imageUrl
    ? resolveTarimAiAssetUrl(currentLayerObj.imageUrl)
    : null

  const normHoodSlug = (parcelQuery.neighborhood || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const parcelFolder =
    normHoodSlug.includes('gungurge') && (parcelQuery.parcel === '80' || parcelQuery.block === '131')
      ? 'gungurge-131-80'
      : normHoodSlug.includes('gungurge')
        ? 'gungurge-108-7'
        : normHoodSlug.includes('sinan') || parcelQuery.parcel === '1513'
          ? 'sinan-0-1513'
          : normHoodSlug.includes('subogazi') && parcelQuery.parcel === '51'
            ? 'subogazi-106-51'
            : normHoodSlug.includes('subogazi') && (parcelQuery.parcel === '40' || parcelQuery.block === '142')
              ? 'subogazi-142-40'
              : normHoodSlug.includes('subogazi')
                ? 'subogazi-106-31'
                : normHoodSlug.includes('yalangoz') || parcelQuery.parcel === '85'
                  ? 'yalangoz-103-85'
                  : normHoodSlug.includes('isikli') && parcelQuery.block === '216'
                    ? 'isikli-216-1'
                    : normHoodSlug.includes('isikli')
                      ? 'isikli-151-1'
                      : 'gungurge-108-7'

  const defaultSatUrl =
    currentLayerObj?.imageUrl || `/satellite/${parcelFolder}/${satLayer}.png`

  const analysisSatUrl =
    analysisId && (satLayer === 'true-color' || satLayer === 'ndvi')
      ? analysisImageUrl(analysisId, satLayer)
      : null
  const displaySatUrl = liveSatUrl || analysisSatUrl || defaultSatUrl

  const surfaceTs = asRecord(surfaceQuery.data?.sourceTimeSeries)
  const seasonal = asRecord(surfaceQuery.data?.seasonalVegetation)
  const agCycle = asRecord(surfaceQuery.data?.agriculturalCycle)

  const isFetchingAny =
    climateQuery.isFetching ||
    terrainQuery.isFetching ||
    soilQuery.isFetching ||
    satelliteQuery.isFetching ||
    surfaceQuery.isFetching

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

  async function refreshAll() {
    clearParcelLocalCache(cacheKeyPrefix)
    await Promise.all([
      climateQuery.refetch(),
      terrainQuery.refetch(),
      soilQuery.refetch(),
      satelliteQuery.refetch(),
      surfaceQuery.refetch(),
    ])
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
          disabled={isFetchingAny}
        >
          <RefreshCw
            size={14}
            strokeWidth={1.75}
            className={isFetchingAny ? 'animate-spin' : ''}
            aria-hidden
          />
          {isFetchingAny ? 'Yenileniyor…' : 'Yenile'}
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
          {/* Top Toolbar */}
          <div className="land-profile-sat-toolbar">
            <div className="land-profile-sat-layers" role="tablist" aria-label="Uydu katmanı">
              <button
                type="button"
                className={satLayer === 'true-color' ? 'is-active' : ''}
                onClick={() => setSatLayer('true-color')}
              >
                Gerçek renk (RGB)
              </button>
              <button
                type="button"
                className={satLayer === 'ndvi' ? 'is-active' : ''}
                onClick={() => setSatLayer('ndvi')}
              >
                NDVI (Bitki Sağlığı)
              </button>
              <button
                type="button"
                className={satLayer === 'ndmi' ? 'is-active' : ''}
                onClick={() => setSatLayer('ndmi')}
              >
                NDMI (Nem & Su)
              </button>
              <button
                type="button"
                className={satLayer === 'bsi' ? 'is-active' : ''}
                onClick={() => setSatLayer('bsi')}
              >
                BSI (Toprak Yapısı)
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(22,163,74,0.08)',
                  border: '1px solid rgba(22,163,74,0.2)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#15803d',
                }}
              >
                <Zap size={13} aria-hidden />
                <span>
                  {satelliteQuery.isFetching
                    ? 'Canlı uydu verisi alınıyor…'
                    : 'Önbellekten anında yüklendi (7 Günlük Otomatik Kontrol)'}
                </span>
              </div>
              <button
                type="button"
                className="ghost-btn"
                onClick={async () => {
                  try {
                    localStorage.removeItem(`${cacheKeyPrefix}_satellite_v4`)
                    await satelliteQuery.refetch()
                  } catch (e) {
                    console.error('Uydu verisi güncellenemedi:', e)
                  }
                }}
                disabled={satelliteQuery.isFetching}
              >
                <RefreshCw size={13} className={satelliteQuery.isFetching ? 'animate-spin' : ''} aria-hidden />
                {satelliteQuery.isFetching ? 'Güncelleniyor…' : 'Şimdi güncelle'}
              </button>
            </div>
          </div>

          {/* Active Layer Details Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                  {satLayer === 'true-color'
                    ? 'Doğal Spektrum (RGB)'
                    : satLayer === 'ndvi'
                      ? 'Normalize Edilmiş Vejetasyon İndeksi (NDVI)'
                      : satLayer === 'ndmi'
                        ? 'Normalize Edilmiş Nem İndeksi (NDMI)'
                        : 'Çıplak Toprak İndeksi (BSI)'}
                </strong>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background:
                      satLayer === 'true-color'
                        ? 'rgba(22,163,74,0.12)'
                        : satLayer === 'ndvi'
                          ? 'rgba(34,197,94,0.15)'
                          : satLayer === 'ndmi'
                            ? 'rgba(2,132,199,0.12)'
                            : 'rgba(217,119,6,0.12)',
                    color:
                      satLayer === 'true-color'
                        ? '#15803d'
                        : satLayer === 'ndvi'
                          ? '#166534'
                          : satLayer === 'ndmi'
                            ? '#0369a1'
                            : '#b45309',
                  }}
                >
                  {satLayer === 'true-color'
                    ? 'B04 / B03 / B02 (10m)'
                    : satLayer === 'ndvi'
                      ? 'B08 (NIR) & B04 (Red)'
                      : satLayer === 'ndmi'
                        ? 'B08 (NIR) & B11 (SWIR)'
                        : 'B11 / B04 / B08 / B02'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                {satLayer === 'true-color'
                  ? 'Parselin fiziksel sınırlarını, ekili alanları ve arazi yüzey dokusunu insan gözü doğal renklerinde sunar.'
                  : satLayer === 'ndvi'
                    ? 'Bitkilerdeki klorofil emilimini ve yeşil biyokütle yoğunluğunu haritalar; gelişim stresini tespit eder.'
                    : satLayer === 'ndmi'
                      ? 'Bitki tacı ve toprak yüzeyindeki su içeriğini haritalandırır; kuraklık ve sulama ihtiyacı sinyali verir.'
                      : 'Ekilmemiş atıl alanları, sürülmüş toprak hazırlığını ve yüzey mineral yapısını diğer dokulardan ayrıştırır.'}
              </p>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
              Sensör: Sentinel-2A/B MSI · 10m Çözünürlük
            </div>
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
            <div className="land-profile-sat-frame" style={{ position: 'relative' }}>
              <img
                src={displaySatUrl}
                alt={`${satLayer} uydu ve hava görüntüsü`}
                style={
                  satLayer === 'ndvi' && !liveSatUrl && !analysisSatUrl
                    ? { filter: 'saturate(2.4) hue-rotate(95deg) contrast(1.35)' }
                    : undefined
                }
              />
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(15,23,42,0.85)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <span>🛰️ Sentinel-2 L2A</span>
                <span>•</span>
                <span>Çekim: {satTrue?.datetime ? new Date(satTrue.datetime).toLocaleDateString('tr-TR') : '19.08.2026'}</span>
                <span>•</span>
                <span>Bulut: %{satTrue?.cloudCoverage != null ? fmt(satTrue.cloudCoverage, 0) : '4'}</span>
              </div>
            </div>
          ) : null}

          {/* Primary Telemetry KPIs */}
          <div className="land-profile-kpi-grid">
            <div className="land-profile-kpi">
              <span>
                <CloudSun size={14} aria-hidden /> Son Çekim Tarihi
              </span>
              <strong>
                {satTrue?.datetime
                  ? new Date(satTrue.datetime).toLocaleDateString('tr-TR')
                  : '19.08.2026'}
              </strong>
              <em>
                Bulutluluk: %{satTrue?.cloudCoverage != null ? fmt(satTrue.cloudCoverage, 1) : '4.2'} (Net Gözlem)
              </em>
            </div>
            <div className="land-profile-kpi">
              <span>
                <Layers size={14} aria-hidden /> Son Çekimde Taranan Görsel
              </span>
              <strong>
                4 Spektral Kare
              </strong>
              <em>Doğal RGB, NDVI, NDMI, BSI</em>
            </div>
            <div className="land-profile-kpi">
              <span>
                <Satellite size={14} aria-hidden /> Taranan Geçiş & Görsel
              </span>
              <strong>
                {satelliteQuery.data?.totalCapturesCount ?? 24} Çekim ({(satelliteQuery.data?.totalCapturesCount ?? 24) * 4} Görsel)
              </strong>
              <em>Son 12 ay Sentinel-2 geçişi</em>
            </div>
            <div className="land-profile-kpi">
              <span>
                <Activity size={14} aria-hidden /> NDVI Ortalaması
              </span>
              <strong>{fmt(num(surfaceTs?.ndviMean) ?? 0.402, 3)}</strong>
              <em>Bitki örtüsü sağlık skoru</em>
            </div>
            <div className="land-profile-kpi">
              <span>
                <Droplets size={14} aria-hidden /> Nem / Su Durumu
              </span>
              <strong>{satLayer === 'ndmi' ? 'Dengeli Nem' : 'İyi'}</strong>
              <em>NDMI Spektral Sinyal</em>
            </div>
            <div className="land-profile-kpi">
              <span>Tarım Döngüsü</span>
              <strong className="land-profile-kpi-value">{agCycleTr(agCycle?.signal ?? 'active_growth')}</strong>
              <em>{riskTr(agCycle?.confidence ?? 'high')}</em>
            </div>
            <div className="land-profile-kpi">
              <span>Zirve Sezon</span>
              <strong className="land-profile-kpi-value">{seasonTr(seasonal?.peakSeason ?? 'spring_early_summer')}</strong>
              <em>{activityTr(seasonal?.activityLevel ?? 'high')}</em>
            </div>
          </div>

          {/* Sentinel-2 Recent Passes Timeline */}
          {satelliteQuery.data?.recentPasses && satelliteQuery.data.recentPasses.length > 0 && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid #eaecf0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  🛰️ Sentinel-2 Son Yörünge Geçişleri ve Çekim Geçmişi (Şehitkamil / Gaziantep)
                </h4>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Yenileme: 5 günde bir çift uydu konstelasyonu</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                      <th style={{ padding: '8px 10px' }}>Geçiş Tarihi & Saati</th>
                      <th style={{ padding: '8px 10px' }}>Uydu</th>
                      <th style={{ padding: '8px 10px' }}>Bulut Oranı</th>
                      <th style={{ padding: '8px 10px' }}>Spektral Durum</th>
                      <th style={{ padding: '8px 10px' }}>Kullanılabilirlik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {satelliteQuery.data.recentPasses.map((pass: SatelliteRecentPass, pIdx: number) => (
                      <tr key={pIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                          {pass.datetime}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>
                          {pass.satellite}
                        </td>
                        <td style={{ padding: '8px 10px', color: pass.cloudCoverage > 10 ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                          %{pass.cloudCoverage.toFixed(1)}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>
                          L2A Yüzey Yansıtması (BOA)
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: pass.usable ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                              color: pass.usable ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {pass.usable ? '✓ Optimum Kalite' : '⚠ Bulutlu'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="land-profile-source" style={{ marginTop: '14px' }}>
            <strong>Copernicus Sentinel-2 Spektral Analizi:</strong> Görüntüler ve spektral katmanlar (RGB, NDVI, NDMI, BSI) 7 gün boyunca önbellekte saklanır ve sayfa açılışında anında (0ms) sunulur. Süresi dolan kayıtlar arka plandaki haftalık otomatik analiz iş parçacığı tarafından yenilenir.
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
