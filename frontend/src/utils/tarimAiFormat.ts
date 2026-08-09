/**
 * Presentation formatters for the "AI Destekli Analiz" (tarim_ai) UI.
 * Everything here is Turkish-facing text/formatting logic — no network calls,
 * no React. Keep this module pure so it can be unit-tested easily.
 */
import { TarimAiError, type AnalysisResult, type CropRecommendationItem, type PlantingWindow } from '../api/tarimAi'

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'idle'

// ---------------------------------------------------------------------------
// Generic object helpers
// ---------------------------------------------------------------------------

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function pick(record: Record<string, unknown> | null, ...keys: string[]): unknown {
  if (!record) return undefined
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key]
  }
  return undefined
}

export function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value
  }
  return undefined
}

/**
 * Some tool endpoints wrap their payload as `{ terrain: {...} }` / `{ landUsability: {...} }`
 * while the analysis orchestrator already returns the unwrapped section. This normalizes both.
 */
export function unwrapSection(data: unknown, key: string): Record<string, unknown> | null {
  const root = asRecord(data)
  if (!root) return null
  const nested = asRecord(root[key])
  const looksLikeSection = (record: Record<string, unknown>) =>
    record.elevation !== undefined ||
    record.slope !== undefined ||
    record.classification !== undefined ||
    record.status !== undefined ||
    record.physicalSuitability !== undefined ||
    record.score != null

  if (nested && looksLikeSection(nested)) return nested
  if (looksLikeSection(root)) return root
  return nested ?? root
}

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

export const SOURCE_LABELS: Record<string, string> = {
  'nasa-power': 'NASA POWER',
  soilgrids: 'SoilGrids',
  'copernicus-dem': 'Copernicus DEM',
  verified_geojson: 'Doğrulanmış GeoJSON',
  mock: 'Mock (demo)',
  tkgm: 'TKGM',
  'sentinel-2': 'Sentinel-2',
  sentinel_2: 'Sentinel-2',
}

export const NATURE_LABELS: Record<string, string> = {
  regional_gridded_estimate: 'Bölgesel ızgara tahmini (ölçüm değil)',
  model_estimate: 'Model tahmini (ölçüm değil)',
  measured: 'Ölçüm',
  estimated: 'Tahmini',
}

export const RISK_LABELS: Record<string, string> = {
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
  unknown: 'Bilinmiyor',
  insufficient: 'Yetersiz veri',
  insufficient_data: 'Yetersiz veri',
  suitable: 'Uygun',
  limited: 'Sınırlı',
  unsuitable: 'Uygun değil',
  flat: 'Düz',
  gentle: 'Hafif eğimli',
  moderate: 'Orta eğimli',
  steep: 'Dik',
  very_steep: 'Çok dik',
  very_low: 'Çok düşük',
  generally_favorable: 'Genel olarak elverişli',
  conditionally_suitable: 'Koşullu uygun',
  recommendation_with_caution: 'Dikkatli öneri',
  favorable: 'Elverişli',
  not_recommended: 'Önerilmez',
}

export const FACTOR_LABELS: Record<string, string> = {
  REAL_TERRAIN_PROFILE_AVAILABLE: 'Gerçek arazi profili mevcut',
  REAL_TERRAIN_FAVORABLE: 'Arazi profili elverişli',
  TERRAIN_SLOPE_GENERALLY_FAVORABLE: 'Eğim genel olarak elverişli',
  TERRAIN_MECHANIZATION_GENERALLY_SUITABLE: 'Mekanizasyon genel olarak uygun',
  LOW_TERRAIN_RUGGEDNESS: 'Düşük arazi engebeliliği',
  MODELED_SOIL_PROFILE_AVAILABLE: 'Model toprak profili mevcut',
  FIELD_SURVEY_MISSING: 'Onaylı saha ölçümü yok',
  STEEP_AREA_RATIO: 'Dik alan oranı yüksek',
  REPEATED_AGRICULTURAL_ACTIVITY_SIGNAL: 'Tekrarlayan tarımsal aktivite sinyali',
}

export const LIMITATION_TR: Record<string, string> = {
  official_parcel_service_unavailable:
    'Resmi parsel servisi (TKGM) şu an kullanılamadı; sınır resmi canlı kayıttan alınamadı.',
  verified_geometry_fallback_used:
    'Doğrulanmış yedek geometri kullanıldı; sınır resmi servisten değil, doğrulanmış GeoJSON’dan geldi.',
  nasa_power_is_regional: '',
  soilgrids_is_estimated: '',
  field_survey_missing: '',
  report_generation_missing: 'PDF rapor üretimi başarısız oldu veya henüz oluşturulamadı.',
  laboratory_soil_analysis_missing:
    'Laboratuvar toprak analizi yok; pH, tuzluluk, besin değerleri ölçülmedi.',
  irrigation_water_analysis_missing:
    'Sulama suyu analizi yok; su kalitesi değerlendirmeye dahil edilmedi.',
  soil_analysis_pdf_uploaded_values_not_extracted:
    'Toprak analizi PDF yüklendi; sayısal değerler otomatik çıkarılmadı — skorlarda SoilGrids kullanıldı.',
  irrigation_water_pdf_uploaded_values_not_extracted:
    'Sulama suyu PDF yüklendi; EC/SAR/pH otomatik çıkarılmadı — kalite skoruna sayısal etki yok.',
  sentinel_credentials_missing: 'Sentinel-2 kimlik bilgileri eksik; uydu görüntüsü alınamadı.',
  sentinel_pipeline_failed: 'Sentinel-2 uydu işlem hattı başarısız oldu.',
  terrain_is_mock: '',
  terrain_data_unavailable: 'Arazi (DEM) verisi alınamadı.',
  terrain_service_not_configured: 'Arazi profili servisi yapılandırılmamış.',
  climate_is_mock: 'İklim verisi demo (mock) kaynaktan geldi.',
  climate_data_unavailable: 'İklim verisi alınamadı.',
  climate_service_not_configured: 'İklim servisi yapılandırılmamış.',
  soil_is_mock: 'Toprak verisi demo (mock) kaynaktan geldi.',
  soil_data_unavailable: 'Toprak verisi alınamadı.',
  soil_service_not_configured: 'Toprak servisi yapılandırılmamış.',
  field_survey_service_not_configured: 'Saha ölçümü servisi yapılandırılmamış.',
  land_usability_analysis_failed: 'Arazi uygunluğu değerlendirmesi başarısız oldu.',
  land_usability_service_not_configured: 'Arazi uygunluğu servisi yapılandırılmamış.',
  crop_compatibility_failed: 'Ürün uyumluluğu hesaplaması başarısız oldu.',
  crop_recommendations_failed: 'Ürün tavsiyeleri oluşturulamadı.',
  crop_recommendation_service_not_configured: 'Ürün tavsiye servisi yapılandırılmamış.',
}

export const STEP_STATUS_TR: Record<string, string> = {
  completed: 'tamamlandı',
  partial_completed: 'tamamlandı (bazı isteğe bağlı katmanlar eksik)',
  partial: 'kısmi',
  processing: 'işleniyor',
  pending: 'bekliyor',
  queued: 'kuyrukta',
  failed: 'başarısız',
  skipped: 'atlandı',
  missing: 'yok',
}

/** Model/heuristic signal codes surfaced as positive/limiting factors on crops or land usability. */
export const MODEL_SIGNAL_LABELS: Record<string, string> = {
  ...FACTOR_LABELS,
  LOW_PROBABLE_ROCK_SIGNAL: 'Düşük yüzey kayalılığı ihtimali',
  MODERATE_PROBABLE_ROCK_SIGNAL: 'Orta düzey yüzey kayalılığı ihtimali',
  HIGH_PROBABLE_ROCK_SIGNAL: 'Yüksek yüzey kayalılığı ihtimali',
  LOW_VEGETATION_VIGOR_SIGNAL: 'Düşük bitki örtüsü canlılığı sinyali',
  MODERATE_VEGETATION_VIGOR_SIGNAL: 'Orta düzey bitki örtüsü canlılığı sinyali',
  HIGH_VEGETATION_VIGOR_SIGNAL: 'Yüksek bitki örtüsü canlılığı sinyali',
  LOW_SOIL_MOISTURE_SIGNAL: 'Düşük toprak nemi sinyali',
  HIGH_SOIL_MOISTURE_SIGNAL: 'Yüksek toprak nemi sinyali',
  BARE_SOIL_SIGNAL: 'Çıplak toprak sinyali',
  STABLE_VEGETATION_TREND: 'İstikrarlı bitki örtüsü eğilimi',
  DECLINING_VEGETATION_TREND: 'Azalan bitki örtüsü eğilimi',
  IMPROVING_VEGETATION_TREND: 'İyileşen bitki örtüsü eğilimi',
}

const DATA_SOURCE_KEY_TR: Record<string, string> = {
  parcel: 'Parsel',
  satellite: 'Uydu görüntüsü',
  terrain: 'Arazi (DEM)',
  climate: 'İklim',
  soil: 'Toprak',
  fieldSurvey: 'Saha ölçümü',
  field_survey: 'Saha ölçümü',
  landUsability: 'Arazi uygunluğu',
  land_usability: 'Arazi uygunluğu',
  cropRecommendations: 'Ürün önerileri',
  crop_recommendations: 'Ürün önerileri',
}

const USABILITY_CLASSIFICATION_TR: Record<string, string> = {
  suitable_for_preliminary_recommendation: 'Tarımsal kullanım için uygun (ön değerlendirme)',
  recommendation_with_caution: 'Koşullu olarak uygun',
  conditionally_suitable: 'Koşullu olarak uygun',
  field_verification_required: 'Saha doğrulaması gerekli',
  strong_physical_constraints: 'Fiziksel kısıtlar nedeniyle sınırlı',
  insufficient_data: 'Veri yetersiz',
  generally_favorable: 'Uygun',
  favorable: 'Uygun',
  limited: 'Sınırlı',
  not_recommended: 'Uygun değil',
  unsuitable: 'Uygun değil',
}

const ANALYSIS_STATUS_TR: Record<string, string> = {
  completed: 'Tamamlandı',
  partial_completed: 'Kısmen tamamlandı',
  partial: 'Kısmen tamamlandı',
  processing: 'İşleniyor',
  pending: 'Bekliyor',
  queued: 'Kuyrukta',
  failed: 'Başarısız',
  error: 'Başarısız',
  cancelled: 'İptal edildi',
  skipped: 'Atlandı',
}

// ---------------------------------------------------------------------------
// Scalar formatters
// ---------------------------------------------------------------------------

export function formatNumber(value: unknown, digits = 1, suffix = ''): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${value.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${suffix}`
}

/** Generic "no data" phrase for user-facing prose (soil texture, checklists, etc). */
export function formatMissingValue(): string {
  return 'Veri bulunamadı'
}

/** Terse placeholder for numeric KPI/table cells. Prefer formatMissingValue() in prose. */
export function formatDash(): string {
  return '—'
}

export function formatRisk(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—'
  return RISK_LABELS[value] ?? value.replaceAll('_', ' ')
}

export function formatLabel(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—'
  return RISK_LABELS[value] ?? FACTOR_LABELS[value] ?? value.replaceAll('_', ' ')
}

export function formatSource(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—'
  return SOURCE_LABELS[value] ?? value
}

export function formatNature(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—'
  return NATURE_LABELS[value] ?? value.replaceAll('_', ' ')
}

/** Turkish label for a data-source key (e.g. `soil`, `terrain`) or an already-known source id. */
export function formatDataSource(keyOrLabel: unknown): string {
  if (typeof keyOrLabel !== 'string' || !keyOrLabel) return '—'
  return DATA_SOURCE_KEY_TR[keyOrLabel] ?? SOURCE_LABELS[keyOrLabel] ?? formatLabel(keyOrLabel)
}

/**
 * Maps a positive/limiting factor code to Turkish text via LIMITATION_TR / FACTOR_LABELS /
 * MODEL_SIGNAL_LABELS. Unknown codes never leak raw snake_case to the user.
 */
export function formatModelSignal(code: unknown): string {
  if (typeof code !== 'string' || !code) return 'Teknik değerlendirme verisi'
  const label = LIMITATION_TR[code] ?? FACTOR_LABELS[code] ?? MODEL_SIGNAL_LABELS[code]
  if (label) return label
  console.debug('Unmapped model signal', code)
  return 'Teknik değerlendirme verisi'
}

/**
 * Formats a factor/limitation entry that may be a plain code string or an
 * `{ factor|code, description|message }` object.
 */
export function formatFactorItem(item: unknown): string {
  if (typeof item === 'string') {
    return formatModelSignal(item)
  }
  const record = asRecord(item)
  if (!record) return String(item)
  const code = String(pick(record, 'factor', 'code') ?? '')
  const description = String(pick(record, 'description', 'message') ?? '').trim()
  const label = code ? formatModelSignal(code) : ''
  const isFallback = label === 'Teknik değerlendirme verisi'
  if (label && !isFallback && description) return `${label}: ${description}`
  if (description) return description
  return label || JSON.stringify(record)
}

export function formatStepStatus(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—'
  return STEP_STATUS_TR[value] ?? value.replaceAll('_', ' ')
}

export function formatDateTr(value: unknown, withTime = false): string {
  if (typeof value !== 'string' || !value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, day] = value.split('-').map(Number)
      return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    }
    return value
  }
  return withTime
    ? d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatAnalysisStatus(status: unknown): string {
  if (typeof status !== 'string' || !status) return formatMissingValue()
  return ANALYSIS_STATUS_TR[status] ?? formatLabel(status)
}

export function formatConfidenceLevel(level: unknown): string {
  if (typeof level !== 'string' || !level) return formatMissingValue()
  switch (level.toLowerCase()) {
    case 'high':
      return 'Yüksek'
    case 'medium':
      return 'Orta'
    case 'low':
      return 'Düşük'
    default:
      return formatMissingValue()
  }
}

export function formatUsabilityClassification(value: unknown): string {
  if (typeof value !== 'string' || !value) return formatMissingValue()
  return USABILITY_CLASSIFICATION_TR[value] ?? formatLabel(value)
}

/** Short Turkish label for how soil data was supplied (used in compact tables/cards). */
export function formatSoilModeShort(mode: unknown): string {
  switch (mode) {
    case 'pdf':
      return 'PDF'
    case 'enter':
      return 'Elle girildi'
    case 'skip':
      return 'SoilGrids'
    default:
      return formatDash()
  }
}

/** Short Turkish label for how irrigation water data was supplied (used in compact tables/cards). */
export function formatIrrigationModeShort(mode: unknown): string {
  switch (mode) {
    case 'pdf':
      return 'PDF'
    case 'enter':
      return 'Elle girildi'
    case 'skip':
      return 'Belirtilmedi'
    default:
      return formatDash()
  }
}

export function formatIrrigationAvailability(value: unknown): string {
  switch (value) {
    case 'unavailable':
      return 'Yok'
    case 'available_limited':
      return 'Var ama sınırlı'
    case 'available_and_sufficient':
      return 'Var ve yeterli'
    case 'unknown':
    default:
      return 'Bilinmiyor'
  }
}

/** Standard agronomic pH bands. */
export function formatPhMeaning(ph: number): string {
  if (typeof ph !== 'number' || Number.isNaN(ph)) return formatMissingValue()
  if (ph < 4.5) return 'Aşırı asidik'
  if (ph < 5.5) return 'Kuvvetli asidik'
  if (ph < 6.5) return 'Hafif asidik'
  if (ph < 7.3) return 'Nötre yakın'
  if (ph < 7.8) return 'Hafif alkali'
  if (ph < 8.5) return 'Alkali'
  return 'Kuvvetli alkali'
}

/** Rough SoilGrids-style organic carbon bands (g/kg). */
export function formatOrganicCarbonMeaning(gPerKg: number): string {
  if (typeof gPerKg !== 'number' || Number.isNaN(gPerKg)) return formatMissingValue()
  if (gPerKg < 5) return 'Düşük'
  if (gPerKg < 15) return 'Orta'
  return 'Yüksek'
}

const OK_STATUSES = new Set([
  'ok',
  'ready',
  'completed',
  'alive',
  'healthy',
  'approved',
  'high',
  'suitable',
  'generally_favorable',
  'favorable',
  'flat',
  'gentle',
  'verified',
  'done',
  'success',
  'suitable_for_preliminary_recommendation',
])

const WARN_STATUSES = new Set([
  'degraded',
  'partial',
  'partial_completed',
  'processing',
  'queued',
  'warning',
  'medium',
  'warn',
  'limited',
  'moderate',
  'conditionally_suitable',
  'recommendation_with_caution',
  'steep',
  'declared',
  'field_verification_required',
  'pending',
])

const BAD_STATUSES = new Set([
  'failed',
  'not_ready',
  'error',
  'missing',
  'bad',
  'low',
  'insufficient',
  'insufficient_data',
  'unsuitable',
  'not_recommended',
  'unavailable',
  'critical',
  'strong_physical_constraints',
])

const INFO_STATUSES = new Set(['info', 'pdf', 'unknown'])

/** Maps a loose status/classification string to the shared color system. */
export function statusTone(value: string): Tone {
  const v = (value ?? '').toLowerCase()
  if (!v) return 'idle'
  if (OK_STATUSES.has(v)) return 'ok'
  if (WARN_STATUSES.has(v)) return 'warn'
  if (BAD_STATUSES.has(v)) return 'bad'
  if (INFO_STATUSES.has(v)) return 'info'
  return 'idle'
}

const MONTH_TR_SHORT = [
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
] as const

export function formatPlantingWindow(window: { startMonth: number; endMonth: number; label?: string }): string {
  const start = MONTH_TR_SHORT[window.startMonth - 1] ?? String(window.startMonth)
  const end = MONTH_TR_SHORT[window.endMonth - 1] ?? String(window.endMonth)
  const range = start === end ? start : `${start}–${end}`
  return window.label ? `${range} · ${window.label}` : range
}

export function formatPdfBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Converts m² to decares (1 dekar = 1000 m²) and formats as "311,2 dekar". */
export function formatAreaDecares(m2: number | null | undefined): string {
  if (typeof m2 !== 'number' || Number.isNaN(m2)) return '—'
  return formatNumber(m2 / 1000, 1, ' dekar')
}

// ---------------------------------------------------------------------------
// Domain-shaped helpers
// ---------------------------------------------------------------------------

export type NormalizedCropRow = {
  id: string
  name: string
  rank: number
  score: number | undefined
  classification: string
  note: string
}

/** Normalizes the various shapes the crop-recommendation payload has taken over time. */
export function normalizeCropRow(item: CropRecommendationItem, index: number): NormalizedCropRow {
  const nestedCrop = item.crop as { id?: string; name?: string } | undefined
  const nestedScore = item.score as
    | number
    | { final?: number; classification?: string; label?: string }
    | undefined
  const nestedExplanation = item.explanation as
    | string
    | { summary?: string; whyRecommended?: string[]; whyNotHigher?: string[] }
    | undefined

  const id = item.cropId || nestedCrop?.id || `crop-${index}`
  const name = item.cropName || nestedCrop?.name || id
  const rank = typeof item.rank === 'number' ? item.rank : index + 1
  const score =
    typeof nestedScore === 'number'
      ? nestedScore
      : typeof nestedScore?.final === 'number'
        ? nestedScore.final
        : undefined
  const classification =
    item.classification ||
    (typeof nestedScore === 'object' ? nestedScore?.classification || nestedScore?.label : undefined) ||
    ''
  const note =
    (typeof nestedExplanation === 'string' ? nestedExplanation : nestedExplanation?.summary) ||
    item.limitingFactors?.slice(0, 2).join(' · ') ||
    item.positiveFactors?.slice(0, 2).join(' · ') ||
    (typeof nestedExplanation === 'object'
      ? nestedExplanation?.whyNotHigher?.slice(0, 2).join(' · ')
      : undefined) ||
    '—'

  return { id, name, rank, score, classification, note }
}

export type SatelliteCaptureInfo = {
  captureDate: string | null
  from: string | undefined
  to: string | undefined
  cloud: unknown
  usable: unknown
  selected: Record<string, unknown> | null
}

export function satelliteCaptureInfo(result: AnalysisResult | null | undefined): SatelliteCaptureInfo {
  const sat = asRecord(result?.satellite)
  const selected = asRecord(pick(sat, 'selectedObservation'))
  const dateRange = asRecord(pick(sat, 'dateRange'))
  const captureDate =
    (pick(selected, 'date') as string | undefined) ||
    (pick(sat, 'latestObservationDate') as string | undefined) ||
    null
  const from = pick(dateRange, 'from') as string | undefined
  const to = pick(dateRange, 'to') as string | undefined
  const cloud = pick(selected, 'cloudCoverage')
  const usable = pick(sat, 'usableObservationCount')
  return { captureDate, from, to, cloud, usable, selected }
}

export const LAYER_META = [
  { id: 'true-color' as const, label: 'Gerçek Renk', hint: 'Gerçek renkli uydu görünümü' },
  { id: 'ndvi' as const, label: 'NDVI', hint: 'Bitki gelişim göstergesi' },
  { id: 'ndmi' as const, label: 'NDMI', hint: 'Nem göstergesi' },
  { id: 'bsi' as const, label: 'BSI', hint: 'Çıplak yüzey göstergesi' },
]

// ---------------------------------------------------------------------------
// Progress stages
// ---------------------------------------------------------------------------

export type ProgressStage = {
  id: string
  label: string
  stepKeys: string[]
}

export const PROGRESS_STAGES: ProgressStage[] = [
  { id: 'parcel', label: 'Parsel bilgileri doğrulanıyor', stepKeys: ['parcel'] },
  {
    id: 'satellite',
    label: 'Uydu görüntüleri hazırlanıyor',
    stepKeys: ['satellite_catalog', 'satellite_imagery', 'satellite_statistics', 'satellite_time_series'],
  },
  { id: 'terrain_climate', label: 'Arazi ve iklim verileri hesaplanıyor', stepKeys: ['terrain', 'climate'] },
  { id: 'soil', label: 'Toprak profili değerlendiriliyor', stepKeys: ['soil', 'field_survey'] },
  {
    id: 'crops',
    label: 'Ürün önerileri oluşturuluyor',
    stepKeys: ['land_usability', 'crop_compatibility', 'recommendations', 'report_ready'],
  },
]

export type StageStatus = 'waiting' | 'processing' | 'completed' | 'warning' | 'error'

export type MappedStage = {
  id: string
  label: string
  status: StageStatus
}

const FAILED_STEP_STATUSES = new Set(['failed'])
const PROCESSING_STEP_STATUSES = new Set(['processing', 'queued', 'pending'])
const WARNING_STEP_STATUSES = new Set(['partial', 'partial_completed', 'skipped', 'missing'])

/** Rolls low-level backend step statuses up into the five user-facing progress stages. */
export function mapStepsToStages(steps: Array<{ key: string; status: string }>): MappedStage[] {
  return PROGRESS_STAGES.map((stage) => {
    const matching = steps.filter((step) => stage.stepKeys.includes(step.key))
    if (matching.length === 0) {
      return { id: stage.id, label: stage.label, status: 'waiting' as StageStatus }
    }
    if (matching.some((step) => FAILED_STEP_STATUSES.has(step.status))) {
      return { id: stage.id, label: stage.label, status: 'error' as StageStatus }
    }
    if (matching.some((step) => PROCESSING_STEP_STATUSES.has(step.status))) {
      return { id: stage.id, label: stage.label, status: 'processing' as StageStatus }
    }
    if (matching.some((step) => WARNING_STEP_STATUSES.has(step.status))) {
      return { id: stage.id, label: stage.label, status: 'warning' as StageStatus }
    }
    if (matching.every((step) => step.status === 'completed')) {
      return { id: stage.id, label: stage.label, status: 'completed' as StageStatus }
    }
    return { id: stage.id, label: stage.label, status: 'processing' as StageStatus }
  })
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Friendly Turkish error copy for the UI. Never surfaces raw stack traces or technical details. */
export function userFacingError(err: unknown): string {
  if (err instanceof TarimAiError) {
    if (err.status === 0) return err.message || 'AI Destekli Analiz servisine bağlanılamadı.'
    if (err.status === 401 || err.status === 403) return 'Bu işlem için yetkiniz bulunmuyor.'
    if (err.status === 404) return 'İlgili kayıt bulunamadı.'
    if (err.status === 409) return err.message || 'İşlem mevcut durumla çakışıyor.'
    if (err.status === 422 || err.status === 400) return err.message || 'Girilen bilgiler işlenemedi.'
    if (err.status >= 500) return 'Sunucu tarafında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
    return err.message || 'İşlem sırasında bir hata oluştu.'
  }
  if (err instanceof Error) return err.message || 'Beklenmeyen bir hata oluştu.'
  return 'Beklenmeyen bir hata oluştu.'
}

// Re-export the PlantingWindow type for convenience so callers don't need a second import.
export type { PlantingWindow }
