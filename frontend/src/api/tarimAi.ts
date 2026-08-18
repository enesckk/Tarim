/**
 * Client for the sibling tarim_ai Express service (default :4000).
 * In Vite dev/preview, requests go through the `/tarim-ai-api` proxy to avoid CORS.
 * Override with VITE_TARIM_AI_URL (e.g. http://localhost:4000) when not using the proxy.
 */
import { API_BASE, currentAccessToken } from './client'

const TARIM_AI_BASE = (import.meta.env.VITE_TARIM_AI_URL as string | undefined)?.replace(/\/$/, '')
  || (API_BASE ? `${API_BASE}/api/tarim-ai` : '/tarim-ai-api')

export { TARIM_AI_BASE }

export class TarimAiError extends Error {
  status: number
  code?: string
  correlationId?: string
  details?: unknown

  constructor(message: string, status: number, extras?: { code?: string; correlationId?: string; details?: unknown }) {
    super(message)
    this.status = status
    this.code = extras?.code
    this.correlationId = extras?.correlationId
    this.details = extras?.details
  }
}

export type ParcelQuery = {
  province: string
  district: string
  neighborhood: string
  block: string
  parcel: string
  landId?: string | null
}

export type ManualSoilMode = 'enter' | 'pdf' | 'skip'
export type ManualIrrigationMode = 'enter' | 'pdf' | 'skip'
export type IrrigationAvailability =
  | 'unavailable'
  | 'available_limited'
  | 'available_and_sufficient'
  | 'unknown'

export type AnalysisPdfAttachment = {
  fileName: string
  contentType: string
  dataBase64: string
}

export type AnalysisAttachmentSummary = {
  kind: 'soil' | 'irrigation'
  fileName: string
  contentType: string
  byteSize: number
  uploadedAt: string
}

export type ManualSoilInput = {
  mode: ManualSoilMode
  ph?: number | null
  ecDsM?: number | null
  organicMatterPercent?: number | null
  clayPercent?: number | null
  sandPercent?: number | null
  siltPercent?: number | null
  attachment?: AnalysisPdfAttachment | null
}

export type ManualIrrigationInput = {
  mode: ManualIrrigationMode
  availability?: IrrigationAvailability | null
  qualityEntered?: boolean
  ecDsM?: number | null
  sar?: number | null
  ph?: number | null
  attachment?: AnalysisPdfAttachment | null
}

export type AnalysisCreateRequest = ParcelQuery & {
  options?: {
    soil?: ManualSoilInput | null
    irrigation?: ManualIrrigationInput | null
  } | null
}

export type ApplicantInputsSummary = {
  soilMode: ManualSoilMode
  irrigationMode: ManualIrrigationMode
  irrigationAvailability?: string | null
  soilValuesUsed?: boolean
  irrigationQualityUsed?: boolean
  soilAttachment?: AnalysisAttachmentSummary | null
  irrigationAttachment?: AnalysisAttachmentSummary | null
  soil?: {
    ph?: number | null
    ecDsM?: number | null
    organicMatterPercent?: number | null
    clayPercent?: number | null
    sandPercent?: number | null
    siltPercent?: number | null
  } | null
  irrigation?: {
    availability?: string | null
    qualityEntered?: boolean
    ecDsM?: number | null
    sar?: number | null
    ph?: number | null
  } | null
}

export type LandAnalysisSummary = {
  landId: string | null
  analysisId: string
  status: string
  completedAt: string | null
  updatedAt?: string
  parcel: ParcelQuery
  summary: {
    landUsabilityClassification: string | null
    landUsabilityScore: number | null
    landUsabilityExplanation: string | null
    confidenceLevel: string | null
    topCrops: Array<{ cropName: string; score: number; rank: number }>
    ndviMean: number | null
    limitations: string[]
    applicantInputs?: ApplicantInputsSummary | null
  }
}

export type HealthResponse = {
  status: string
  persistence?: string
  idempotency?: Record<string, unknown>
}

export type ApiHealthResponse = {
  status?: string
  ready?: boolean
  alive?: boolean
  services?: Record<string, unknown>
  version?: string
  [key: string]: unknown
}

export type DemoReadiness = {
  status: 'ready' | 'degraded' | 'not_ready' | string
  mode?: string
  database?: Record<string, unknown>
  goldenDataset?: Record<string, unknown>
  providers?: Record<string, unknown>
  reportGeneration?: Record<string, unknown>
  warnings?: string[]
  [key: string]: unknown
}

export type AnalysisCreated = {
  analysisId: string
  parcelId: string | null
  status: string
  createdAt: string
}

export type AnalysisStep = {
  key: string
  label: string
  status: string
  startedAt?: string
  completedAt?: string
  error?: string | null
  durationMs?: number
}

export type AnalysisStatus = {
  analysisId: string
  status: string
  progress: number
  currentStep: string | null
  steps: AnalysisStep[]
}

export type CropRecommendationItem = {
  cropId: string
  cropName: string
  rank: number
  score: number
  classification: string
  isTopFive?: boolean
  positiveFactors?: string[]
  limitingFactors?: string[]
  criticalFailures?: string[]
  explanation?: string
  [key: string]: unknown
}

export type AnalysisResult = {
  analysisId: string
  status: string
  parcel?: Record<string, unknown> | null
  dataSources?: Array<Record<string, unknown>>
  satellite?: Record<string, unknown> | null
  terrain?: Record<string, unknown> | null
  climate?: Record<string, unknown> | null
  soil?: Record<string, unknown> | null
  fieldSurvey?: Record<string, unknown> | null
  landUsability?: Record<string, unknown> | null
  cropRecommendations?: CropRecommendationItem[]
  confidence?: Record<string, unknown> | null
  limitations?: string[]
  recommendedNextActions?: string[]
  applicantInputs?: ApplicantInputsSummary | null
  recommendationsArePreliminary?: boolean
  generatedAt?: string
  [key: string]: unknown
}

export type CropListItem = {
  id: string
  name?: string
  displayName?: string
  category?: string
  seasonalOrPerennial?: string
  [key: string]: unknown
}

export type PlantingWindow = {
  startMonth: number
  endMonth: number
  label?: string
}

export type CropDetail = {
  id: string
  name?: string
  displayName?: string
  category?: string
  seasonalOrPerennial?: string
  phenology?: {
    hemisphere?: string
    plantingWindows?: PlantingWindow[]
    cycleLengthDays?: { minimum?: number; typical?: number; maximum?: number }
  } | null
  [key: string]: unknown
}

function parseErrorBody(body: unknown, status: number): TarimAiError {
  if (!body || typeof body !== 'object') {
    return new TarimAiError(`İstek başarısız (${status})`, status)
  }
  const record = body as Record<string, unknown>
  const nested = record.error
  if (nested && typeof nested === 'object') {
    const err = nested as Record<string, unknown>
    return new TarimAiError(
      typeof err.message === 'string' ? err.message : `İstek başarısız (${status})`,
      status,
      {
        code: typeof err.code === 'string' ? err.code : undefined,
        correlationId: typeof err.correlationId === 'string' ? err.correlationId : undefined,
        details: err.details,
      },
    )
  }
  return new TarimAiError(
    typeof nested === 'string'
      ? nested
      : typeof record.message === 'string'
        ? record.message
        : `İstek başarısız (${status})`,
    status,
    {
      code: typeof record.code === 'string' ? record.code : undefined,
      correlationId: typeof record.correlationId === 'string' ? record.correlationId : undefined,
      details: record.details,
    },
  )
}

export async function tarimAiFetch<T>(
  path: string,
  options: RequestInit = {},
  acceptStatuses: number[] = [],
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body != null && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const accessToken = currentAccessToken()
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response: Response
  try {
    response = await fetch(`${TARIM_AI_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new TarimAiError(
      'AI Destekli Analiz servisine bağlanılamadı. Lütfen daha sonra tekrar deneyin.',
      0,
      { code: 'CONNECTION_REFUSED' },
    )
  }

  if (!response.ok && !acceptStatuses.includes(response.status)) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = null
    }
    throw parseErrorBody(body, response.status)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export function analysisImageUrl(analysisId: string, layer: 'true-color' | 'ndvi' | 'ndmi' | 'bsi') {
  return `${TARIM_AI_BASE}/api/analyses/${encodeURIComponent(analysisId)}/images/${layer}`
}

export function analysisReportPdfUrl(analysisId: string) {
  return `${TARIM_AI_BASE}/api/analyses/${encodeURIComponent(analysisId)}/report.pdf`
}

/** Prefix relative tarim_ai paths (e.g. `/api/analyses/.../images/ndvi`) with the Vite proxy base. */
export function resolveTarimAiAssetUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  if (
    pathOrUrl.startsWith('/drone_photos/') ||
    pathOrUrl.startsWith('/satellite/') ||
    pathOrUrl.startsWith('/chapters/') ||
    pathOrUrl.startsWith('/images/')
  ) {
    return pathOrUrl
  }
  if (pathOrUrl.startsWith('/')) return `${TARIM_AI_BASE}${pathOrUrl}`
  return `${TARIM_AI_BASE}/${pathOrUrl.replace(/^\//, '')}`
}

export type DroneImageItem = {
  id: string
  capturedAt: string
  uploadedAt: string
  fileName: string
  contentType: string
  byteSize: number
  analysisId?: string | null
  note?: string | null
  landId: string
  landName: string
  parcel?: ParcelQuery | null
  imageUrl: string
}

/**
 * Prefer imageUrl embedded in analysis result (golden mode may point at the captured analysis id).
 * Fall back to current analysisId path.
 */
export function satelliteLayerImageUrl(
  result: AnalysisResult | null | undefined,
  analysisId: string | null | undefined,
  layer: 'true-color' | 'ndvi' | 'ndmi' | 'bsi',
): string | null {
  const obs =
    result?.satellite && typeof result.satellite === 'object'
      ? ((result.satellite as Record<string, unknown>).selectedObservation as
          | Record<string, unknown>
          | undefined)
      : undefined

  const layerKey =
    layer === 'true-color' ? 'trueColor' : layer === 'ndvi' ? 'ndvi' : layer === 'ndmi' ? 'ndmi' : 'bsi'
  const block = obs?.[layerKey]
  const embedded =
    block && typeof block === 'object'
      ? (block as Record<string, unknown>).imageUrl
      : undefined
  if (typeof embedded === 'string' && embedded.trim()) {
    return resolveTarimAiAssetUrl(embedded)
  }
  const fileKey = layer === 'true-color' ? 'true-color.png' : `${layer}.png`
  return `/satellite/gungurge-108-7/${fileKey}`
}

export const tarimAi = {
  health: () => tarimAiFetch<HealthResponse>('/health'),
  apiHealth: () => tarimAiFetch<ApiHealthResponse>('/api/health'),
  live: () => tarimAiFetch<ApiHealthResponse>('/api/health/live'),
  ready: () => tarimAiFetch<ApiHealthResponse>('/api/health/ready'),
  readiness: () => tarimAiFetch<DemoReadiness>('/api/demo/readiness'),

  resolveParcel: (query: ParcelQuery) =>
    tarimAiFetch<Record<string, unknown>>('/api/parcel/resolve', {
      method: 'POST',
      body: JSON.stringify(query),
    }),

  analyzeParcel: (query: ParcelQuery) =>
    tarimAiFetch<Record<string, unknown>>('/api/parcel/analyze', {
      method: 'POST',
      body: JSON.stringify(query),
    }),

  createAnalysis: (query: AnalysisCreateRequest) =>
    tarimAiFetch<AnalysisCreated>('/api/analyses', {
      method: 'POST',
      body: JSON.stringify(query),
    }),

  latestLandAnalysis: (
    landId: string,
    parcel?: Partial<ParcelQuery> | null,
    opts?: { full?: boolean },
  ) => {
    const params = new URLSearchParams()
    if (parcel?.province) params.set('province', parcel.province)
    if (parcel?.district) params.set('district', parcel.district)
    if (parcel?.neighborhood) params.set('neighborhood', parcel.neighborhood)
    if (parcel?.block) params.set('block', parcel.block)
    if (parcel?.parcel) params.set('parcel', parcel.parcel)
    if (opts?.full) params.set('full', '1')
    const qs = params.toString()
    return tarimAiFetch<LandAnalysisSummary & { result?: AnalysisResult }>(
      `/api/analyses/by-land/${encodeURIComponent(landId)}${qs ? `?${qs}` : ''}`,
    )
  },

  listLandAnalyses: () =>
    tarimAiFetch<{ items: LandAnalysisSummary[] }>('/api/analyses/cache').then((res) => ({
      items: (res.items ?? []).map((item) => ({
        landId: item.landId ?? null,
        analysisId: item.analysisId,
        status: item.status,
        completedAt: item.completedAt ?? null,
        updatedAt: item.updatedAt,
        parcel: item.parcel,
        summary: item.summary,
      })),
    })),

  getCachedAnalysis: (analysisId: string, opts?: { full?: boolean }) => {
    const qs = opts?.full ? '?full=1' : ''
    return tarimAiFetch<LandAnalysisSummary & { result?: AnalysisResult }>(
      `/api/analyses/cache/${encodeURIComponent(analysisId)}${qs}`,
    )
  },

  analysisStatus: (analysisId: string) =>
    tarimAiFetch<AnalysisStatus>(`/api/analyses/${encodeURIComponent(analysisId)}/status`),

  analysisResult: (analysisId: string) =>
    tarimAiFetch<AnalysisResult | { analysisId: string; status: string; progress?: number; message?: string }>(
      `/api/analyses/${encodeURIComponent(analysisId)}`,
      {},
      [202],
    ),

  analysisReportPdfUrl: (analysisId: string) => analysisReportPdfUrl(analysisId),

  downloadAnalysisReportPdf: async (analysisId: string) => {
    const url = analysisReportPdfUrl(analysisId)
    const token = currentAccessToken()
    const response = await fetch(url, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) {
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      throw parseErrorBody(body, response.status)
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `tarim-ai-rapor-${analysisId}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  },

  analysisAttachmentUrl: (analysisId: string, kind: 'soil' | 'irrigation') =>
    `${TARIM_AI_BASE}/api/analyses/${encodeURIComponent(analysisId)}/attachments/${kind}`,

  downloadAnalysisAttachment: async (
    analysisId: string,
    kind: 'soil' | 'irrigation',
    fileName?: string,
  ) => {
    const url = `${TARIM_AI_BASE}/api/analyses/${encodeURIComponent(analysisId)}/attachments/${kind}`
    const token = currentAccessToken()
    const response = await fetch(url, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) {
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      throw parseErrorBody(body, response.status)
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download =
      fileName?.trim() ||
      (kind === 'soil' ? `toprak-analizi-${analysisId}.pdf` : `su-analizi-${analysisId}.pdf`)
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  },

  evaluateCrops: (body: {
    parcelQuery: ParcelQuery
    options?: {
      topN?: number
      irrigationScenario?: 'unknown' | 'rainfed' | 'limited' | 'full'
      plantingScenario?: 'automatic' | 'earliest' | 'latest' | 'custom'
    }
  }) =>
    tarimAiFetch<Record<string, unknown>>('/api/crop-recommendations/evaluate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listCrops: () =>
    tarimAiFetch<CropListItem[] | { items?: CropListItem[]; crops?: CropListItem[]; count?: number }>(
      '/api/crops',
    ),

  getCrop: (cropId: string) =>
    tarimAiFetch<CropDetail>(`/api/crops/${encodeURIComponent(cropId)}`),

  listCropsWithPhenology: async (): Promise<CropDetail[]> => {
    const raw = await tarimAiFetch<
      CropDetail[] | { items?: CropDetail[]; crops?: CropDetail[]; count?: number }
    >('/api/crops')
    const list: CropDetail[] = Array.isArray(raw) ? raw : (raw.crops ?? raw.items ?? [])
    // Return the list directly — seasonalOrPerennial is already present in the list response.
    // We no longer fire N individual /api/crops/:id requests which were slow and unreliable.
    return list
  },

  terrainProfile: (parcelQuery: ParcelQuery) =>
    tarimAiFetch<Record<string, unknown>>('/api/terrain/profile', {
      method: 'POST',
      body: JSON.stringify({ parcelQuery }),
    }),

  climateProfile: (parcelQuery: ParcelQuery, years?: number) =>
    tarimAiFetch<Record<string, unknown>>('/api/environment/climate/profile', {
      method: 'POST',
      body: JSON.stringify({ parcelQuery, years }),
    }),

  bestTrueColor: (geometry: unknown, days = 60) =>
    tarimAiFetch<Record<string, unknown>>('/api/satellite/best/true-color', {
      method: 'POST',
      body: JSON.stringify({ geometry, days }),
    }),

  bestNdvi: (geometry: unknown, days = 60) =>
    tarimAiFetch<Record<string, unknown>>('/api/satellite/best/ndvi', {
      method: 'POST',
      body: JSON.stringify({ geometry, days }),
    }),

  soilProfile: (parcelQuery: ParcelQuery) =>
    tarimAiFetch<Record<string, unknown>>('/api/environment/soil/profile', {
      method: 'POST',
      body: JSON.stringify({ parcelQuery }),
    }),

  environmentProfile: (parcelQuery: ParcelQuery) =>
    tarimAiFetch<Record<string, unknown>>('/api/environment/profile', {
      method: 'POST',
      body: JSON.stringify({ parcelQuery }),
    }),

  landUsability: (parcelQuery: ParcelQuery) =>
    tarimAiFetch<Record<string, unknown>>('/api/land-usability/analyze', {
      method: 'POST',
      body: JSON.stringify({ parcelQuery }),
    }),

  surfaceAnalysis: (parcelQuery: ParcelQuery, months = 12) =>
    tarimAiFetch<Record<string, unknown>>('/api/satellite/surface-analysis', {
      method: 'POST',
      body: JSON.stringify({ parcelQuery, months }),
    }),

  listDroneImages: (filters?: {
    analysisId?: string
    landId?: string
    province?: string
    district?: string
    neighborhood?: string
    block?: string
    parcel?: string
  }) => {
    const params = new URLSearchParams()
    if (filters?.analysisId) params.set('analysisId', filters.analysisId)
    if (filters?.landId) params.set('landId', filters.landId)
    if (filters?.province) params.set('province', filters.province)
    if (filters?.district) params.set('district', filters.district)
    if (filters?.neighborhood) params.set('neighborhood', filters.neighborhood)
    if (filters?.block) params.set('block', filters.block)
    if (filters?.parcel) params.set('parcel', filters.parcel)
    const qs = params.toString()
    return tarimAiFetch<{ items: DroneImageItem[]; count: number }>(
      `/api/drone-images${qs ? `?${qs}` : ''}`,
    )
  },

  uploadDroneImage: (body: {
    capturedAt: string
    fileName: string
    contentType: string
    dataBase64: string
    landId: string
    landName: string
    analysisId?: string | null
    note?: string | null
    parcelQuery?: ParcelQuery | null
  }) =>
    tarimAiFetch<DroneImageItem>('/api/drone-images', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteDroneImage: (id: string) =>
    tarimAiFetch<void>(`/api/drone-images/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
}
