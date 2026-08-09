// @ts-nocheck
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  CloudSun,
  Layers,
  Loader2,
  MapPin,
  Mountain,
  RefreshCw,
  Satellite,
  Sprout,
} from 'lucide-react'
import {
  tarimAi,
  type AnalysisResult,
  type AnalysisStatus,
  type CropDetail,
  type IrrigationAvailability,
  type ManualIrrigationMode,
  type ManualSoilMode,
  type ParcelQuery,
  type PlantingWindow,
} from '../api/tarimAi'
import { api } from '../api/client'
import type { Land } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/utils'
import {
  AnalysisPageHeader,
  AnalysisProgress,
  AnalysisResultHeader,
  AnalysisTabs,
  type AnalysisTabId,
  ClimateSoilTab,
  CriticalDecisionBanner,
  CropRecommendationsTab,
  DecisionSummaryCards,
  OptionalFieldDataAccordion,
  OverviewTab,
  ParcelSelectionCard,
  SatelliteTerrainTab,
  SourcesConfidenceTab,
  Toast,
  type ToastMessage,
} from '../components/tarimAi'
import { deriveDecisionSummary } from '../utils/tarimAiDecision'
import { FieldLogDashboard } from '../components/field-logs/FieldLogDashboard'
import { ToolResultCard } from '../components/tarimAi/ToolResultCard'
import { FieldLogEntryForm } from '../components/field-logs/FieldLogEntryForm'
import {
  formatPlantingWindow,
  userFacingError,
} from '../utils/tarimAiFormat'
import '../components/tarimAi/tarimAi.css'
import '../layout/layout.css'

type ShellTab = 'analysis' | 'tools' | 'status' | 'field-logs'
type ToolId = 'resolve' | 'crops' | 'terrain' | 'climate' | 'soil' | 'usability' | 'surface'
type Phase = 'setup' | 'running' | 'result'

const emptyParcel = (): ParcelQuery => ({
  province: '',
  district: '',
  neighborhood: '',
  block: '',
  parcel: '',
})

const TOOL_ACTIONS = [
  { id: 'resolve' as const, label: 'Parsel çöz', icon: MapPin },
  { id: 'crops' as const, label: 'Ürün önerileri', icon: Sprout },
  { id: 'terrain' as const, label: 'Arazi profili', icon: Mountain },
  { id: 'climate' as const, label: 'İklim profili', icon: CloudSun },
  { id: 'soil' as const, label: 'Toprak profili', icon: Layers },
  { id: 'usability' as const, label: 'Arazi uygunluğu', icon: Activity },
  { id: 'surface' as const, label: 'Yüzey analizi', icon: Satellite },
]

const MAX_ANALYSIS_PDF_BYTES = 12 * 1024 * 1024

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

async function readPdfFileAsAttachment(file: File) {
  const name = file.name.trim()
  if (!name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Yalnızca .pdf uzantılı dosya yükleyebilirsiniz.')
  }
  const type = (file.type || 'application/pdf').toLowerCase()
  if (
    type &&
    type !== 'application/pdf' &&
    type !== 'application/x-pdf' &&
    type !== 'application/octet-stream'
  ) {
    throw new Error('Dosya türü PDF olmalıdır.')
  }
  if (file.size <= 0) throw new Error('PDF dosyası boş.')
  if (file.size > MAX_ANALYSIS_PDF_BYTES) throw new Error('PDF en fazla 12 MB olabilir.')
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const header = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0)
  if (header !== '%PDF') throw new Error('Geçersiz PDF dosyası.')
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return {
    fileName: name,
    contentType: 'application/pdf',
    dataBase64: btoa(binary),
  }
}

function cropDisplayName(crop: CropDetail): string {
  return String(crop.displayName || crop.name || crop.id)
}

export function TarimAiPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [shellTab, setShellTab] = useState<ShellTab>('analysis')

  const [parcel, setParcel] = useState<ParcelQuery>(emptyParcel)
  const [selectedLandId, setSelectedLandId] = useState(() => searchParams.get('landId') ?? '')

  const [analysisBusy, setAnalysisBusy] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [progressCollapsed, setProgressCollapsed] = useState(false)
  const [resultTab, setResultTab] = useState<AnalysisTabId>('overview')

  const [soilMode, setSoilMode] = useState<ManualSoilMode>('skip')
  const [soilPh, setSoilPh] = useState('')
  const [soilEc, setSoilEc] = useState('')
  const [soilOm, setSoilOm] = useState('')
  const [soilClay, setSoilClay] = useState('')
  const [soilSand, setSoilSand] = useState('')
  const [soilSilt, setSoilSilt] = useState('')
  const [soilPdfFile, setSoilPdfFile] = useState<File | null>(null)

  const [irrigationMode, setIrrigationMode] = useState<ManualIrrigationMode>('skip')
  const [irrigationAvailability, setIrrigationAvailability] =
    useState<IrrigationAvailability>('unknown')
  const [waterQualityEntered, setWaterQualityEntered] = useState(false)
  const [waterEc, setWaterEc] = useState('')
  const [waterSar, setWaterSar] = useState('')
  const [waterPh, setWaterPh] = useState('')
  const [irrigationPdfFile, setIrrigationPdfFile] = useState<File | null>(null)

  const [pdfBusy, setPdfBusy] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const [toolParcel, setToolParcel] = useState<ParcelQuery>(emptyParcel)
  const [toolLandId, setToolLandId] = useState('')
  const [activeTool, setActiveTool] = useState<ToolId>('resolve')
  const [toolBusy, setToolBusy] = useState(false)
  const [toolError, setToolError] = useState<string | null>(null)
  const [toolResult, setToolResult] = useState<unknown>(null)

  const pollRef = useRef<number | null>(null)
  const missingRef = useRef<HTMLDivElement | null>(null)
  const toastSeq = useRef(0)
  const didAutoselectLand = useRef(Boolean(searchParams.get('landId')))

  function pushToast(message: string, tone: ToastMessage['tone'] = 'info') {
    toastSeq.current += 1
    setToasts((prev) => [...prev, { id: `t-${toastSeq.current}`, message, tone }])
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const healthQuery = useQuery({
    queryKey: ['tarim-ai', 'health'],
    queryFn: () => tarimAi.health(),
    retry: false,
    refetchInterval: 30_000,
  })
  const readinessQuery = useQuery({
    queryKey: ['tarim-ai', 'readiness'],
    queryFn: () => tarimAi.readiness(),
    retry: false,
    refetchInterval: 60_000,
  })
  const landsQuery = useQuery({
    queryKey: ['tarim-ai', 'ams-lands'],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token),
    retry: false,
  })
  const connected = healthQuery.isSuccess
  const lands = landsQuery.data ?? []

  const seasonalCropsQuery = useQuery({
    queryKey: ['tarim-ai', 'crops-phenology'],
    queryFn: () => tarimAi.listCropsWithPhenology(),
    retry: false,
    enabled: connected && shellTab === 'analysis',
  })

  const plantingByCropId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const crop of seasonalCropsQuery.data ?? []) {
      const windows = crop.phenology?.plantingWindows ?? []
      if (!windows.length) continue
      const label = windows.map((w: PlantingWindow) => formatPlantingWindow(w)).join(' · ')
      map[crop.id] = label
      map[cropDisplayName(crop).toLocaleLowerCase('tr-TR')] = label
    }
    return map
  }, [seasonalCropsQuery.data])

  const pastAnalysesQuery = useQuery({
    queryKey: ['tarim-ai', 'past-analyses'],
    queryFn: () => tarimAi.listLandAnalyses(),
    enabled: connected && shellTab === 'analysis',
    retry: false,
    refetchInterval: analysisBusy ? 5000 : 30_000,
  })

  const cropsQuery = useQuery({
    queryKey: ['tarim-ai', 'crops'],
    queryFn: async () => {
      const raw = await tarimAi.listCrops()
      if (Array.isArray(raw)) return raw
      return raw.crops ?? raw.items ?? []
    },
    retry: false,
    enabled: shellTab === 'tools' || shellTab === 'status',
  })

  const hasCompletedResult = Boolean(
    analysisResult &&
      (analysisResult.status === 'completed' || analysisResult.status === 'partial_completed'),
  )

  const showPhase: Phase =
    analysisBusy && !hasCompletedResult
      ? 'running'
      : hasCompletedResult
        ? 'result'
        : 'setup'

  const decision = useMemo(
    () => (analysisResult && hasCompletedResult ? deriveDecisionSummary(analysisResult, plantingByCropId) : null),
    [analysisResult, hasCompletedResult, plantingByCropId],
  )

  const selectedToolLand = useMemo(
    () => lands.find((l) => l.id === toolLandId),
    [lands, toolLandId],
  )

  const parcelReady =
    Boolean(parcel.province?.trim()) &&
    Boolean(parcel.district?.trim()) &&
    Boolean(parcel.neighborhood?.trim()) &&
    Boolean(parcel.block?.trim()) &&
    Boolean(parcel.parcel?.trim())

  function clearAnalysisOutput() {
    if (pollRef.current != null) {
      window.clearTimeout(pollRef.current)
      pollRef.current = null
    }
    setAnalysisBusy(false)
    setAnalysisError(null)
    setAnalysisId(null)
    setAnalysisStatus(null)
    setAnalysisResult(null)
    setProgressCollapsed(false)
    setResultTab('overview')
  }

  function selectAnalysisLand(landId: string) {
    setSelectedLandId(landId)
    clearAnalysisOutput()
    if (!landId) return
    const land = lands.find((item) => item.id === landId)
    if (land) setParcel(landToParcelQuery(land))
  }

  useEffect(() => {
    // Only seed the first land once. Clearing selectedLandId (e.g. for manual
    // ada/parsel entry) must not instantly re-select a registered land.
    if (didAutoselectLand.current) return
    if (!selectedLandId && lands.length > 0) {
      const fromUrl = searchParams.get('landId')
      const first = fromUrl ? lands.find((item) => item.id === fromUrl) ?? lands[0] : lands[0]
      didAutoselectLand.current = true
      setSelectedLandId(first.id)
      setParcel(landToParcelQuery(first))
      if (!toolLandId) {
        setToolLandId(first.id)
        setToolParcel(landToParcelQuery(first))
      }
    }
  }, [selectedLandId, toolLandId, lands, searchParams])

  useEffect(() => {
    const analysisFromUrl = searchParams.get('analysisId')
    if (!analysisFromUrl || analysisId === analysisFromUrl || analysisBusy) return
    let cancelled = false
    ;(async () => {
      try {
        setAnalysisBusy(true)
        setAnalysisId(analysisFromUrl)
        const status = await tarimAi.analysisStatus(analysisFromUrl)
        if (cancelled) return
        setAnalysisStatus(status)
        if (['completed', 'partial_completed', 'failed'].includes(status.status)) {
          const result = await tarimAi.analysisResult(analysisFromUrl)
          if (cancelled) return
          if ('cropRecommendations' in result || 'parcel' in result) {
            setAnalysisResult(result as AnalysisResult)
            setProgressCollapsed(true)
          }
          setAnalysisBusy(false)
        } else {
          await pollAnalysis(analysisFromUrl)
        }
      } catch {
        if (!cancelled) {
          setAnalysisBusy(false)
          setAnalysisError(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    return () => {
      if (pollRef.current != null) window.clearTimeout(pollRef.current)
    }
  }, [])

  async function pollAnalysis(id: string) {
    try {
      const status = await tarimAi.analysisStatus(id)
      setAnalysisStatus(status)
      const done = ['completed', 'partial_completed', 'failed'].includes(status.status)
      if (!done) {
        pollRef.current = window.setTimeout(() => {
          void pollAnalysis(id)
        }, 1200)
        return
      }
      const result = await tarimAi.analysisResult(id)
      if ('cropRecommendations' in result || 'parcel' in result) {
        setAnalysisResult(result as AnalysisResult)
        if (status.status !== 'failed') setProgressCollapsed(true)
      }
      setAnalysisBusy(false)
      void pastAnalysesQuery.refetch()
    } catch (err) {
      setAnalysisError(userFacingError(err))
      setAnalysisBusy(false)
    }
  }

  async function onStartAnalysis(e: FormEvent) {
    e.preventDefault()
    if (analysisBusy) return
    if (!parcelReady) {
      setAnalysisError('Analiz başlatmak için arazi seçin veya parsel bilgilerini tamamlayın.')
      return
    }
    if (pollRef.current != null) window.clearTimeout(pollRef.current)
    setAnalysisBusy(true)
    setAnalysisError(null)
    setAnalysisResult(null)
    setAnalysisStatus(null)
    setAnalysisId(null)
    setProgressCollapsed(false)
    setResultTab('overview')

    const parseNum = (raw: string) => {
      const t = raw.trim()
      if (!t) return null
      const n = Number(t.replace(',', '.'))
      return Number.isFinite(n) ? n : null
    }

    if (soilMode === 'enter') {
      const values = [soilPh, soilEc, soilOm, soilClay, soilSand, soilSilt].map(parseNum)
      if (values.every((v) => v == null)) {
        setAnalysisError('Toprak verisini elle giriyorsanız en az bir değer yazın (ör. pH).')
        setAnalysisBusy(false)
        return
      }
    }
    if (soilMode === 'pdf' && !soilPdfFile) {
      setAnalysisError('Toprak analizi için PDF seçin veya elle giriş / yoksa devam seçin.')
      setAnalysisBusy(false)
      return
    }
    if (irrigationMode === 'enter' && waterQualityEntered) {
      const values = [waterEc, waterSar, waterPh].map(parseNum)
      if (values.every((v) => v == null)) {
        setAnalysisError('Su kalitesi giriyorsanız EC, SAR veya pH değerlerinden en az birini yazın.')
        setAnalysisBusy(false)
        return
      }
    }
    if (irrigationMode === 'pdf' && !irrigationPdfFile) {
      setAnalysisError('Sulama suyu analizi için PDF seçin veya elle giriş / yoksa devam seçin.')
      setAnalysisBusy(false)
      return
    }

    try {
      let soilAttachment = null as Awaited<ReturnType<typeof readPdfFileAsAttachment>> | null
      let irrigationAttachment = null as Awaited<ReturnType<typeof readPdfFileAsAttachment>> | null
      if (soilMode === 'pdf' && soilPdfFile) soilAttachment = await readPdfFileAsAttachment(soilPdfFile)
      if (irrigationMode === 'pdf' && irrigationPdfFile) {
        irrigationAttachment = await readPdfFileAsAttachment(irrigationPdfFile)
      }

      const created = await tarimAi.createAnalysis({
        ...parcel,
        landId: selectedLandId || null,
        options: {
          soil: {
            mode: soilMode,
            ...(soilMode === 'enter'
              ? {
                  ph: parseNum(soilPh),
                  ecDsM: parseNum(soilEc),
                  organicMatterPercent: parseNum(soilOm),
                  clayPercent: parseNum(soilClay),
                  sandPercent: parseNum(soilSand),
                  siltPercent: parseNum(soilSilt),
                }
              : {}),
            ...(soilMode === 'pdf' && soilAttachment ? { attachment: soilAttachment } : {}),
          },
          irrigation: {
            mode: irrigationMode,
            ...(irrigationMode === 'enter'
              ? {
                  availability: irrigationAvailability,
                  qualityEntered: waterQualityEntered,
                  ...(waterQualityEntered
                    ? {
                        ecDsM: parseNum(waterEc),
                        sar: parseNum(waterSar),
                        ph: parseNum(waterPh),
                      }
                    : {}),
                }
              : {}),
            ...(irrigationMode === 'pdf' && irrigationAttachment
              ? { attachment: irrigationAttachment }
              : {}),
          },
        },
      })
      setAnalysisId(created.analysisId)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('analysisId', created.analysisId)
        if (selectedLandId) next.set('landId', selectedLandId)
        return next
      })
      if (['completed', 'partial_completed', 'failed'].includes(created.status)) {
        const status = await tarimAi.analysisStatus(created.analysisId)
        setAnalysisStatus(status)
        const result = await tarimAi.analysisResult(created.analysisId)
        if ('cropRecommendations' in result || 'parcel' in result) {
          setAnalysisResult(result as AnalysisResult)
          if (created.status !== 'failed') setProgressCollapsed(true)
        }
        setAnalysisBusy(false)
        void pastAnalysesQuery.refetch()
        return
      }
      await pollAnalysis(created.analysisId)
    } catch (err) {
      setAnalysisError(userFacingError(err))
      setAnalysisBusy(false)
    }
  }

  async function onDownloadPdf() {
    if (!analysisId) return
    setPdfBusy(true)
    try {
      await tarimAi.downloadAnalysisReportPdf(analysisId)
      pushToast('PDF rapor indirildi.', 'ok')
    } catch (err) {
      pushToast(userFacingError(err), 'bad')
    } finally {
      setPdfBusy(false)
    }
  }

  function goToSetupForNewAnalysis() {
    if (pollRef.current != null) {
      window.clearTimeout(pollRef.current)
      pollRef.current = null
    }
    setAnalysisBusy(false)
    setAnalysisError(null)
    setAnalysisResult(null)
    setAnalysisStatus(null)
    setAnalysisId(null)
    setProgressCollapsed(false)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('analysisId')
      return next
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onRefreshAnalysis() {
    if (!parcelReady || analysisBusy) return
    const form = document.getElementById('tai2-analysis-form') as HTMLFormElement | null
    if (form) form.requestSubmit()
    else {
      const fake = { preventDefault() {} } as FormEvent
      await onStartAnalysis(fake)
    }
  }

  async function onRunTool(e: FormEvent) {
    e.preventDefault()
    setToolBusy(true)
    setToolError(null)
    setToolResult(null)
    try {
      let result: unknown
      switch (activeTool) {
        case 'resolve':
          result = await tarimAi.resolveParcel(toolParcel)
          break
        case 'crops':
          result = await tarimAi.evaluateCrops({
            parcelQuery: toolParcel,
            options: { topN: 5, irrigationScenario: 'unknown', plantingScenario: 'automatic' },
          })
          break
        case 'terrain':
          result = await tarimAi.terrainProfile(toolParcel)
          break
        case 'climate':
          result = await tarimAi.climateProfile(toolParcel)
          break
        case 'soil':
          result = await tarimAi.soilProfile(toolParcel)
          break
        case 'usability':
          result = await tarimAi.landUsability(toolParcel)
          break
        case 'surface':
          result = await tarimAi.surfaceAnalysis(toolParcel, 12)
          break
      }
      setToolResult(result)
    } catch (err) {
      setToolError(userFacingError(err))
    } finally {
      setToolBusy(false)
    }
  }

  const pdfEnabled = Boolean(analysisId && hasCompletedResult)
  const selectedLand = lands.find((land) => land.id === selectedLandId) ?? null

  return (
    <div className="tai2-page">
      <AnalysisPageHeader
        connected={connected}
        readiness={readinessQuery.data}
        health={healthQuery.data}
        onRefresh={() => {
          void onRefreshAnalysis()
        }}
        onPdf={() => {
          void onDownloadPdf()
        }}
        pdfEnabled={pdfEnabled}
        busy={analysisBusy}
        pdfBusy={pdfBusy}
      />

      <nav className="tai2-shell-tabs" aria-label="Sayfa bölümleri">
        {(
          [
            ['analysis', 'Analiz'],
            ['tools', 'Hızlı araçlar'],
            ['field-logs', 'Tarla Günlüğü'],
            ['status', 'Bağlantı'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn('tai2-shell-tab', shellTab === id && 'is-active')}
            onClick={() => setShellTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {!connected ? (
        <div className="tai2-alert tai2-alert-bad" role="alert">
          Analiz servisine bağlanılamadı. Servis ayakta olduğunda sayfayı yenileyin.
        </div>
      ) : null}

      {shellTab === 'field-logs' ? (
        <div className="tai2-stack">
          <FieldLogDashboard 
            producerId={user?.id || '00000000-0000-0000-0000-000000000001'} 
            onAddLog={() => {}} 
          />
        </div>
      ) : null}

      {shellTab === 'analysis' ? (
        <div className="tai2-stack">
          {showPhase === 'setup' ? (
            <>
              <form id="tai2-analysis-form" className="tai2-stack" onSubmit={onStartAnalysis}>
                <ParcelSelectionCard
                  lands={lands}
                  selectedLandId={selectedLandId}
                  onLandSelect={selectAnalysisLand}
                  parcel={parcel}
                  onParcelChange={setParcel}
                  disabled={analysisBusy}
                  landsLoading={landsQuery.isLoading}
                  areaDecares={selectedLand?.sizeInDecares}
                />

                <OptionalFieldDataAccordion
                  soilMode={soilMode}
                  onSoilModeChange={setSoilMode}
                  soilPh={soilPh}
                  onSoilPhChange={setSoilPh}
                  soilEc={soilEc}
                  onSoilEcChange={setSoilEc}
                  soilOm={soilOm}
                  onSoilOmChange={setSoilOm}
                  soilClay={soilClay}
                  onSoilClayChange={setSoilClay}
                  soilSand={soilSand}
                  onSoilSandChange={setSoilSand}
                  soilSilt={soilSilt}
                  onSoilSiltChange={setSoilSilt}
                  soilPdfFile={soilPdfFile}
                  onSoilPdfFileChange={setSoilPdfFile}
                  irrigationMode={irrigationMode}
                  onIrrigationModeChange={setIrrigationMode}
                  irrigationAvailability={irrigationAvailability}
                  onIrrigationAvailabilityChange={setIrrigationAvailability}
                  waterQualityEntered={waterQualityEntered}
                  onWaterQualityEnteredChange={setWaterQualityEntered}
                  waterEc={waterEc}
                  onWaterEcChange={setWaterEc}
                  waterSar={waterSar}
                  onWaterSarChange={setWaterSar}
                  waterPh={waterPh}
                  onWaterPhChange={setWaterPh}
                  irrigationPdfFile={irrigationPdfFile}
                  onIrrigationPdfFileChange={setIrrigationPdfFile}
                  disabled={analysisBusy}
                />

                <div className="tai2-start-panel">
                  <div className="tai2-start-panel-copy">
                    <strong>Analizi başlat</strong>
                    <p>
                      {!parcelReady
                        ? 'Kayıtlı araziden seçin veya il / ilçe / mahalle / ada / parsel girin.'
                        : 'Parsel hazır. İsterseniz toprak ve su verisi ekleyin, ardından analizi başlatın.'}
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="tai2-btn tai2-btn-primary tai2-btn-lg tai2-start-cta"
                    disabled={analysisBusy || !connected || !parcelReady}
                    aria-label="Analizi başlat"
                  >
                    {analysisBusy ? (
                      <>
                        <Loader2 className="tai2-btn-icon tai2-spin" size={18} />
                        Analiz hazırlanıyor…
                      </>
                    ) : (
                      'Analizi başlat'
                    )}
                  </button>
                </div>
              </form>

              {analysisError ? (
                <div className="tai2-alert tai2-alert-bad" role="alert">
                  {analysisError}
                </div>
              ) : null}

              {analysisResult?.status === 'failed' ? (
                <div className="tai2-alert tai2-alert-bad" role="alert">
                  Analiz tamamlanamadı. Bilgileri kontrol edip yeniden deneyin.
                </div>
              ) : null}

              <p className="tai2-muted tai2-reports-hint">
                Geçmiş analizler{' '}
                <Link to="/reports?tab=ai" className="tai2-inline-link">
                  Raporlar → AI analiz geçmişi
                </Link>{' '}
                sekmesindedir.
              </p>
            </>
          ) : null}

          {showPhase === 'running' ? (
            <div className="tai2-stack">
              <AnalysisProgress
                status={analysisStatus}
                result={analysisResult}
                busy={analysisBusy}
                error={analysisError}
                collapsed={false}
              />
              {analysisError ? (
                <div className="tai2-alert tai2-alert-bad" role="alert">
                  {analysisError}
                  <button
                    type="button"
                    className="tai2-btn tai2-btn-ghost"
                    onClick={goToSetupForNewAnalysis}
                  >
                    Forma dön
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {showPhase === 'result' && analysisResult && decision ? (
            <div className="tai2-stack">
              <AnalysisProgress
                status={analysisStatus}
                result={analysisResult}
                busy={false}
                error={null}
                collapsed={progressCollapsed}
                onToggleCollapse={() => setProgressCollapsed((v) => !v)}
              />

              <AnalysisResultHeader
                summary={decision}
                sticky
                onPdf={() => {
                  void onDownloadPdf()
                }}
                onRefresh={() => {
                  void onRefreshAnalysis()
                }}
                onNewAnalysis={goToSetupForNewAnalysis}
                pdfEnabled={pdfEnabled}
                pdfBusy={pdfBusy}
              />

              <DecisionSummaryCards summary={decision} />

              <CriticalDecisionBanner
                note={decision.criticalNote}
                onShowMissing={() => {
                  setResultTab('overview')
                  window.setTimeout(() => {
                    missingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 50)
                }}
                onFieldSurvey={() => {
                  pushToast('Saha kontrolü oluşturma formu yakında eklenecek.', 'info')
                }}
              />

              <div ref={missingRef}>
                <AnalysisTabs active={resultTab} onChange={setResultTab}>
                  {resultTab === 'overview' ? (
                    <OverviewTab
                      result={analysisResult}
                      summary={decision}
                      plantingByCropId={plantingByCropId}
                    />
                  ) : null}
                  {resultTab === 'satellite' ? (
                    <SatelliteTerrainTab result={analysisResult} analysisId={analysisId} />
                  ) : null}
                  {resultTab === 'climate' ? <ClimateSoilTab result={analysisResult} /> : null}
                  {resultTab === 'crops' ? (
                    <CropRecommendationsTab
                      result={analysisResult}
                      plantingByCropId={plantingByCropId}
                      cropsList={seasonalCropsQuery.data ?? []}
                    />
                  ) : null}
                  {resultTab === 'sources' ? <SourcesConfidenceTab result={analysisResult} /> : null}
                </AnalysisTabs>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {shellTab === 'tools' ? (
        <div className="tai2-stack tai2-secondary">
          <section className="tai2-card">
            <div className="tai2-card-header">
              <h2 className="tai2-card-title">Hızlı araçlar</h2>
            </div>
            <p className="tai2-muted">
              Tek endpoint çağrıları — tam analiz yerine hızlı kontrol için.
            </p>
            <div className="tai2-tool-picks">
              {TOOL_ACTIONS.map((tool) => {
                const Icon = tool.icon
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={cn('tai2-tool-pick', activeTool === tool.id && 'is-active')}
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <Icon size={16} />
                    {tool.label}
                  </button>
                )
              })}
            </div>
            <form className="tai2-stack" onSubmit={onRunTool}>
              <ParcelSelectionCard
                lands={lands}
                selectedLandId={toolLandId}
                onLandSelect={(id) => {
                  setToolLandId(id)
                  const land = lands.find((l) => l.id === id)
                  if (land) setToolParcel(landToParcelQuery(land))
                }}
                parcel={toolParcel}
                onParcelChange={setToolParcel}
                disabled={toolBusy}
                landsLoading={landsQuery.isLoading}
              />
              <button type="submit" className="tai2-btn tai2-btn-primary" disabled={toolBusy || !connected}>
                {toolBusy ? 'Çalışıyor…' : 'Çalıştır'}
              </button>
            </form>
            {toolError ? <div className="tai2-alert tai2-alert-bad">{toolError}</div> : null}
            <ToolResultCard toolId={activeTool} result={toolResult} parcelQuery={toolParcel} selectedLand={selectedToolLand} />
          </section>
        </div>
      ) : null}

      {shellTab === 'status' ? (
        <div className="tai2-stack tai2-secondary">
          <section className="tai2-card">
            <div className="tai2-card-header">
              <h2 className="tai2-card-title">Bağlantı durumu</h2>
              <button
                type="button"
                className="tai2-btn tai2-btn-ghost"
                onClick={() => {
                  void healthQuery.refetch()
                  void readinessQuery.refetch()
                }}
              >
                <RefreshCw size={16} />
                Yenile
              </button>
            </div>
            <dl className="tai2-kpi-grid">
              <div>
                <dt>Analiz servisi</dt>
                <dd>{connected ? 'Bağlı' : 'Bağlı değil'}</dd>
              </div>
              <div>
                <dt>Hazırlık</dt>
                <dd>
                  {readinessQuery.data?.status === 'ready'
                    ? 'Hazır'
                    : readinessQuery.data?.status === 'degraded'
                      ? 'Kısmi hizmet'
                      : readinessQuery.data?.status === 'not_ready'
                        ? 'Hazır değil'
                        : readinessQuery.data?.status
                          ? String(readinessQuery.data.status)
                          : '—'}
                </dd>
              </div>
              <div>
                <dt>Çalışma modu</dt>
                <dd>
                  {readinessQuery.data?.mode === 'live'
                    ? 'Canlı'
                    : readinessQuery.data?.mode === 'golden'
                      ? 'Altın veri seti'
                      : readinessQuery.data?.mode ?? '—'}
                </dd>
              </div>
            </dl>
            {cropsQuery.data ? (
              <p className="tai2-muted">Ürün kataloğu: {cropsQuery.data.length} kayıt</p>
            ) : null}
          </section>
        </div>
      ) : null}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default TarimAiPage
