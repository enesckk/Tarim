/**
 * Derives decision-ready UI data from a raw AnalysisResult.
 *
 * This module never invents numbers that aren't in the payload — it only
 * translates, labels, and prioritizes what the backend already returned.
 */
import type { AnalysisResult, ApplicantInputsSummary, CropRecommendationItem, DemoReadiness } from '../api/tarimAi'
import {
  asRecord,
  formatAnalysisStatus,
  formatAreaDecares,
  formatConfidenceLevel,
  formatDateTr,
  formatFactorItem,
  formatLabel,
  formatModelSignal,
  formatNumber,
  formatUsabilityClassification,
  LIMITATION_TR,
  normalizeCropRow,
  pick,
  statusTone,
  unwrapSection,
  type Tone,
} from './tarimAiFormat'

export type WaterStatus = 'verified' | 'unverified' | 'declared' | 'pdf'

export type MissingChecklistItem = {
  id: string
  label: string
  priority: 'high' | 'medium' | 'low'
  done: boolean
  actionLabel?: string
}

export type TopCropSummary = {
  name: string
  score: number | null
  planting: string
  blurb: string
}

export type DecisionBadge = {
  label: string
  tone: Tone
}

export type DecisionSummary = {
  parcelTitle: string
  locationLine: string | null
  areaLine: string | null
  analysisDate: string | null
  usabilityScore: number | null
  usabilityStatus: string
  usabilityTone: Tone
  usabilityBlurb: string
  topCrop: TopCropSummary | null
  waterStatus: WaterStatus
  waterTitle: string
  waterBlurb: string
  waterTone: Tone
  confidenceLevel: string
  confidenceTone: Tone
  confidenceBlurb: string
  criticalNote: string
  missingChecklist: MissingChecklistItem[]
  strengths: string[]
  concerns: string[]
  badges: DecisionBadge[]
}

// ---------------------------------------------------------------------------
// Parcel / location
// ---------------------------------------------------------------------------

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function buildParcelTitle(parcel: Record<string, unknown> | null): string {
  const neighborhood = asNonEmptyString(pick(parcel, 'neighborhood'))
  const block = pick(parcel, 'block')
  const parcelNo = pick(parcel, 'parcel')

  const neighborhoodLabel = neighborhood
    ? /mahalle/i.test(neighborhood)
      ? neighborhood
      : `${neighborhood} Mahallesi`
    : null

  const adaParsel = `Ada ${block != null && block !== '' ? String(block) : '—'} / Parsel ${
    parcelNo != null && parcelNo !== '' ? String(parcelNo) : '—'
  }`

  return [neighborhoodLabel, adaParsel].filter(Boolean).join(' · ')
}

function buildLocationLine(parcel: Record<string, unknown> | null): string | null {
  const parts = [pick(parcel, 'province'), pick(parcel, 'district')]
    .map(asNonEmptyString)
    .filter((part): part is string => part !== null)
  return parts.length ? parts.join(' / ') : null
}

// ---------------------------------------------------------------------------
// Usability
// ---------------------------------------------------------------------------

function defaultUsabilityBlurb(classification: string | undefined): string {
  switch (classification) {
    case 'suitable_for_preliminary_recommendation':
      return 'Mevcut uzaktan algılama ve model verilerine göre arazi, tarımsal kullanım için ön değerlendirmede uygun görünüyor.'
    case 'recommendation_with_caution':
    case 'conditionally_suitable':
      return 'Arazi koşullu olarak uygun görünüyor; bazı kısıtlar için saha doğrulaması önerilir.'
    case 'field_verification_required':
      return 'Kesin bir karar için saha doğrulaması gerekiyor.'
    case 'strong_physical_constraints':
      return 'Fiziksel kısıtlar nedeniyle arazi kullanımı sınırlı görünüyor.'
    case 'insufficient_data':
      return 'Sağlıklı bir değerlendirme yapmak için yeterli veri bulunmuyor.'
    case 'generally_favorable':
    case 'favorable':
      return 'Arazi koşulları genel olarak tarımsal kullanım için elverişli görünüyor.'
    case 'limited':
      return 'Arazi kullanımı bazı sınırlayıcı koşullar içeriyor.'
    case 'not_recommended':
    case 'unsuitable':
      return 'Mevcut verilere göre tarımsal kullanım önerilmiyor.'
    default:
      return 'Değerlendirme için yeterli veri henüz oluşmadı.'
  }
}

function deriveUsability(result: AnalysisResult): {
  score: number | null
  status: string
  tone: Tone
  blurb: string
  classification: string | undefined
  positiveFactors: unknown
  limitingFactors: unknown
} {
  const land = unwrapSection(result.landUsability, 'landUsability')
  const classificationRaw = pick(land, 'classification', 'status')
  const classification = typeof classificationRaw === 'string' ? classificationRaw : undefined
  const scoreRaw = pick(land, 'score')
  const score = typeof scoreRaw === 'number' && !Number.isNaN(scoreRaw) ? scoreRaw : null
  const explanation = asNonEmptyString(pick(land, 'explanation'))

  return {
    score,
    status: formatUsabilityClassification(classification),
    tone: statusTone(classification ?? ''),
    blurb: explanation ?? defaultUsabilityBlurb(classification),
    classification,
    positiveFactors: pick(land, 'positiveFactors'),
    limitingFactors: pick(land, 'limitingFactors'),
  }
}

// ---------------------------------------------------------------------------
// Top crop
// ---------------------------------------------------------------------------

function deriveTopCrop(
  crops: CropRecommendationItem[] | undefined,
  plantingByCropId: Record<string, string> | undefined,
): TopCropSummary | null {
  if (!crops || crops.length === 0) return null
  const row = normalizeCropRow(crops[0], 0)
  return {
    name: row.name,
    score: typeof row.score === 'number' ? row.score : null,
    planting: (row.id && plantingByCropId?.[row.id]) || '—',
    blurb: row.note !== '—' ? row.note : 'Bu ürün için ek açıklama bulunmuyor.',
  }
}

// ---------------------------------------------------------------------------
// Water status
// ---------------------------------------------------------------------------

function deriveWaterInfo(
  applicantInputs: ApplicantInputsSummary | null | undefined,
  limitations: string[],
): { status: WaterStatus; title: string; blurb: string; tone: Tone } {
  const mode = applicantInputs?.irrigationMode
  const irrigation = applicantInputs?.irrigation

  if (mode === 'pdf') {
    const fileName = applicantInputs?.irrigationAttachment?.fileName
    return {
      status: 'pdf',
      title: 'PDF yüklendi',
      blurb: fileName
        ? `${fileName} kaydedildi; sayısal değerler otomatik çıkarılmadı.`
        : 'Su analizi PDF kaydedildi; sayısal değerler otomatik çıkarılmadı.',
      tone: 'info',
    }
  }

  if (mode === 'enter' && applicantInputs?.irrigationQualityUsed) {
    return {
      status: 'verified',
      title: 'Doğrulandı',
      blurb: `Elle girildi · EC ${formatNumber(irrigation?.ecDsM, 2, ' dS/m')} · SAR ${formatNumber(
        irrigation?.sar,
        1,
      )} · pH ${formatNumber(irrigation?.ph, 1)}`,
      tone: 'ok',
    }
  }

  if (mode === 'enter') {
    return {
      status: 'declared',
      title: 'Kısmen beyan edildi',
      blurb: 'Su mevcudiyeti girildi; EC / SAR / pH kalite değerleri verilmedi.',
      tone: 'warn',
    }
  }

  // mode === 'skip', or missing entirely — treat as unverified/critical either way.
  const missingNote = limitations.includes('irrigation_water_analysis_missing')
    ? LIMITATION_TR.irrigation_water_analysis_missing
    : 'Kuyu, sulama kaynağı veya su kalitesi bilgisi bulunamadı.'
  return {
    status: 'unverified',
    title: 'Doğrulanmadı',
    blurb: missingNote,
    tone: 'bad',
  }
}

// ---------------------------------------------------------------------------
// Missing checklist
// ---------------------------------------------------------------------------

function deriveMissingChecklist(result: AnalysisResult): MissingChecklistItem[] {
  const applicantInputs = result.applicantInputs
  const limitations = result.limitations ?? []
  const fieldSurvey = asRecord(result.fieldSurvey)
  const fieldSurveyStatus = pick(fieldSurvey, 'status')

  const soilLabDone = applicantInputs?.soilValuesUsed === true
  const irrigationDone = applicantInputs?.irrigationQualityUsed === true
  const fieldSurveyDone = fieldSurveyStatus === 'approved'
  const reportDone = !limitations.includes('report_generation_missing')

  const soilPdfDone = applicantInputs?.soilMode === 'pdf'
  const irrigationPdfDone = applicantInputs?.irrigationMode === 'pdf'

  const checklist: MissingChecklistItem[] = [
    {
      id: 'irrigation_water',
      label: 'Sulama kaynağını doğrula',
      priority: 'high',
      done: irrigationDone || irrigationPdfDone,
      actionLabel: irrigationDone || irrigationPdfDone ? undefined : 'Su verisi ekle',
    },
    {
      id: 'soil_lab',
      label: 'Toprak laboratuvar analizi ekle',
      priority: 'high',
      done: soilLabDone || soilPdfDone,
      actionLabel: soilLabDone || soilPdfDone ? undefined : 'Toprak analizi ekle',
    },
    {
      id: 'field_survey',
      label: 'Saha kontrolü planla',
      priority: 'medium',
      done: fieldSurveyDone,
      actionLabel: fieldSurveyDone ? undefined : 'Saha ziyareti planla',
    },
    {
      id: 'report',
      label: 'PDF rapor üretimi',
      priority: 'low',
      done: reportDone,
      actionLabel: reportDone ? undefined : 'Raporu yeniden oluştur',
    },
  ]

  return checklist
}

// ---------------------------------------------------------------------------
// Strengths / concerns
// ---------------------------------------------------------------------------

function collectFactorTexts(sources: unknown[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const source of sources) {
    if (!Array.isArray(source)) continue
    for (const item of source) {
      const text = formatFactorItem(item)
      if (!text || seen.has(text)) continue
      seen.add(text)
      out.push(text)
      if (out.length >= max) return out
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

function deriveConfidence(
  result: AnalysisResult,
  missingChecklist: MissingChecklistItem[],
): { level: string; tone: Tone; blurb: string } {
  const confidence = asRecord(result.confidence)
  const levelRaw = pick(confidence, 'level')
  const level = typeof levelRaw === 'string' ? levelRaw : undefined
  const explanation = asNonEmptyString(pick(confidence, 'explanation'))
  const missing = missingChecklist.filter((item) => !item.done)

  const blurb =
    explanation ??
    (missing.length
      ? `Eksik veriler güven düzeyini etkiliyor: ${missing.map((item) => item.label).join(', ')}.`
      : 'Mevcut veri kümesi güven düzeyini destekliyor.')

  return {
    level: formatConfidenceLevel(level),
    tone: statusTone(level ?? ''),
    blurb,
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function deriveDecisionSummary(
  result: AnalysisResult,
  plantingByCropId?: Record<string, string>,
): DecisionSummary {
  const parcel = asRecord(result.parcel)
  const limitations = result.limitations ?? []

  const parcelTitle = buildParcelTitle(parcel)
  const locationLine = buildLocationLine(parcel)
  const areaRaw = pick(parcel, 'areaSquareMeters')
  const areaLine = typeof areaRaw === 'number' ? formatAreaDecares(areaRaw) : null
  const analysisDate = typeof result.generatedAt === 'string' ? formatDateTr(result.generatedAt, true) : null

  const usability = deriveUsability(result)
  const topCrop = deriveTopCrop(result.cropRecommendations, plantingByCropId)
  const water = deriveWaterInfo(result.applicantInputs, limitations)
  const missingChecklist = deriveMissingChecklist(result)
  const confidence = deriveConfidence(result, missingChecklist)

  const topCropItem = result.cropRecommendations?.[0]
  const strengths = collectFactorTexts([usability.positiveFactors, topCropItem?.positiveFactors], 6)
  const concerns = collectFactorTexts(
    [limitations, usability.limitingFactors, topCropItem?.limitingFactors, topCropItem?.criticalFailures],
    6,
  )

  const highPriorityMissing = missingChecklist.filter((item) => item.priority === 'high' && !item.done)
  const criticalNote = highPriorityMissing.length
    ? `Arazi genel olarak tarımsal kullanıma değerlendirilebilir; ancak ${highPriorityMissing
        .map((item) => item.label.toLocaleLowerCase('tr-TR'))
        .join(' ve ')} doğrulanmadan nihai ürün veya tahsis kararı verilmemelidir.`
    : result.recommendationsArePreliminary
      ? 'Arazi genel olarak tarımsal kullanıma uygundur. Sonuçlar ön değerlendirme niteliğindedir; saha doğrulaması önerilir.'
      : ''

  const statusLabel =
    result.status === 'completed' || result.status === 'partial_completed'
      ? 'Analiz tamamlandı'
      : formatAnalysisStatus(result.status)
  const badges: DecisionBadge[] = [
    { label: statusLabel, tone: statusTone(result.status ?? '') },
    {
      label: confidence.level === 'Veri bulunamadı' ? 'Güven belirsiz' : `${confidence.level} güven`,
      tone: confidence.tone,
    },
  ]
  if (result.recommendationsArePreliminary) {
    badges.push({ label: 'Ön değerlendirme', tone: 'warn' })
  }

  return {
    parcelTitle,
    locationLine,
    areaLine,
    analysisDate,
    usabilityScore: usability.score,
    usabilityStatus: usability.status,
    usabilityTone: usability.tone,
    usabilityBlurb: usability.blurb,
    topCrop,
    waterStatus: water.status,
    waterTitle: water.title,
    waterBlurb: water.blurb,
    waterTone: water.tone,
    confidenceLevel: confidence.level,
    confidenceTone: confidence.tone,
    confidenceBlurb: confidence.blurb,
    criticalNote,
    missingChecklist,
    strengths,
    concerns,
    badges,
  }
}

// ---------------------------------------------------------------------------
// System / connectivity status (health + demo readiness → popover-ready rows)
// ---------------------------------------------------------------------------

export type SystemStatusRow = {
  label: string
  value: string
  tone: Tone
}

export type SystemStatusSummary = {
  tone: Tone
  label: string
  serviceRow: SystemStatusRow
  satelliteRow: SystemStatusRow
  tkgmRow: SystemStatusRow
  soilRow: SystemStatusRow
  workingMode: string | null
}

function providerStatusLabel(status: unknown): string {
  switch (status) {
    case 'configured':
      return 'Bağlı'
    case 'mock':
      return 'Demo (mock)'
    case 'not_configured':
      return 'Yapılandırılmamış'
    default:
      return typeof status === 'string' && status ? formatLabel(status) : 'Bilinmiyor'
  }
}

function providerStatusTone(status: unknown): Tone {
  if (status === 'configured') return 'ok'
  if (status === 'mock') return 'warn'
  if (status === 'not_configured') return 'bad'
  return 'idle'
}

/** Picks the least-healthy status among a set of provider statuses (worst-case rollup). */
function worstProviderStatus(statuses: unknown[]): unknown {
  if (statuses.includes('not_configured')) return 'not_configured'
  if (statuses.includes('mock')) return 'mock'
  const defined = statuses.filter((status) => status !== undefined)
  if (defined.length && defined.every((status) => status === 'configured')) return 'configured'
  return defined[0]
}

/** Derives the "Analiz servisi" row from the health check + top-level connectivity flag. */
function deriveServiceRow(connected: boolean, health: unknown): SystemStatusRow {
  if (!connected) return { label: 'Analiz servisi', value: 'Bağlantı yok', tone: 'bad' }
  const healthStatus = pick(asRecord(health), 'status')
  if (typeof healthStatus === 'string' && statusTone(healthStatus) === 'bad') {
    return { label: 'Analiz servisi', value: 'Sorunlu', tone: 'warn' }
  }
  return { label: 'Analiz servisi', value: 'Bağlı', tone: 'ok' }
}

export function deriveSystemStatus(
  connected: boolean,
  readiness?: DemoReadiness | null,
  health?: unknown,
  mode?: string,
): SystemStatusSummary {
  const providers = asRecord(pick(asRecord(readiness), 'providers'))
  const satKeyStatus =
    pick(asRecord(pick(providers, 'sentinelProcess')), 'status') ??
    pick(asRecord(pick(providers, 'sentinelCatalog')), 'status') ??
    pick(asRecord(pick(providers, 'sentinelAuth')), 'status')
  const satelliteStatus = satKeyStatus ?? (connected ? 'configured' : undefined)

  const tkgmKeyStatus = pick(asRecord(pick(providers, 'parcel')), 'status')
  const tkgmStatus = tkgmKeyStatus ?? (connected ? 'configured' : undefined)

  const soilKeyStatus = pick(asRecord(pick(providers, 'soilGrids')), 'status')
  const soilStatus = soilKeyStatus ?? (connected ? 'configured' : undefined)

  const serviceRow = deriveServiceRow(connected, health)
  const workingModeRaw =
    mode ||
    (typeof readiness?.mode === 'string' ? readiness.mode : undefined) ||
    (connected ? 'live' : null)

  const workingMode =
    workingModeRaw === 'live'
      ? 'Canlı Analiz Modu'
      : workingModeRaw === 'golden'
        ? 'Doğrulanmış Bölgesel Veri'
        : workingModeRaw ?? 'Canlı Analiz'

  const overallTone: Tone = !connected ? 'bad' : 'ok'
  const overallLabel = !connected ? 'Bağlantı yok' : 'Sistem aktif'

  return {
    tone: overallTone,
    label: overallLabel,
    serviceRow,
    satelliteRow: {
      label: 'Uydu servisi',
      value: connected ? 'Sentinel-2 (Copernicus) Bağlı' : providerStatusLabel(satelliteStatus),
      tone: connected ? 'ok' : providerStatusTone(satelliteStatus),
    },
    tkgmRow: {
      label: 'TKGM servisi',
      value: connected ? 'Ada / Parsel Servisi Bağlı' : providerStatusLabel(tkgmStatus),
      tone: connected ? 'ok' : providerStatusTone(tkgmStatus),
    },
    soilRow: {
      label: 'Toprak veri servisi',
      value: connected ? 'SoilGrids / Saha Verisi Bağlı' : providerStatusLabel(soilStatus),
      tone: connected ? 'ok' : providerStatusTone(soilStatus),
    },
    workingMode,
  }
}

// Re-export for callers that only need factor-code translation alongside the summary.
export { formatModelSignal }
