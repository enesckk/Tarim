import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Layers,
  Map,
  MapPin,
  MessageSquare,
  NotebookPen,
  Pencil,
  Plane,
  Plus,
  RotateCcw,
  Scan,
  ShieldCheck,
  Sprout,
  Activity,
  UserCog,
  UserRound,
  Workflow as WorkflowIcon,
  XCircle,
} from 'lucide-react'
import { api } from '../api/client'
import { mediaUrl } from '../api/media'
import { resolveTarimAiAssetUrl, tarimAi, TarimAiError } from '../api/tarimAi'
import { getDronePhotosForParcel } from '../utils/dronePhotos'
import { LandClimateChartCard } from '../components/LandClimateChartCard'
import type {
  ChatMessage,
  ConversationDetail,
  ConversationListItem,
  Inspection,
  Land,
  LandAlert,
  LandNote,
  LandProduction,
  Producer,
  Season,
  StaffUser,
  TaskItem,
  Workflow,
} from '../api/types'
import {
  INSPECTION_RESULT,
  INSPECTION_STATUS,
  PRODUCTION_WORKFLOW_STATUS,
  TASK_STATUS,
} from '../api/types'
import {
  TASK_THEMES,
  buildPlannedEvidence,
  emptyPlannedForm,
  themeEvidenceHint,
  themeLabel,
  validatePlannedEvidence,
  type PlannedEvidenceForm,
} from '../api/taskThemes'
import { useAuth } from '../auth/AuthContext'
import { isAdmin, isOfficer } from '../auth/roles'
import { Lightbox, type LightboxImage } from '../components/Lightbox'
import { PlannedEvidenceFields } from '../components/PlannedEvidenceFields'
import { neighborhoodSelectOptions } from '../constants/sehitkamilNeighborhoods'
import {
  formatLatitudeInput,
  formatLongitudeInput,
  parseOptionalCoordinates,
} from '../utils/coordinates'
import '../layout/layout.css'

function normalizeDateOnly(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (isoMatch) return trimmed

  const localMatch = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed)
  if (!localMatch) {
    throw new Error('Son tarihi gün.ay.yıl biçiminde girin.')
  }

  const [, day, month, year] = localMatch
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const base64 = result.includes(',') ? result.split(',')[1] : result
      if (!base64) reject(new Error('Dosya okunamadı'))
      else resolve(base64)
    }
    reader.onerror = () => reject(new Error('Dosya okunamadı'))
    reader.readAsDataURL(file)
  })
}

function LandActionModal({
  ariaLabel,
  onClose,
  children,
}: {
  ariaLabel: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return createPortal(
    <div
      className="land-action-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <div className="land-action-modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function LandDetailPage() {
  const { landId } = useParams<{ landId: string }>()
  const location = useLocation()
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const admin = isAdmin(user?.roles)
  const officer = isOfficer(user?.roles)
  const [plan, setPlan] = useState({
    workflowId: '',
    seasonId: '',
    producerId: '',
  })
  const [reassignFor, setReassignFor] = useState<string | null>(null)
  const [reassignProducerId, setReassignProducerId] = useState('')
  const [assignForm, setAssignForm] = useState({ producerId: '', officerUserId: '' })
  const [noteBody, setNoteBody] = useState('')
  const [droneCapturedAt, setDroneCapturedAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [droneFile, setDroneFile] = useState<File | null>(null)
  const [droneFileKey, setDroneFileKey] = useState(0)
  const [droneUploadError, setDroneUploadError] = useState<string | null>(null)
  const [droneUploading, setDroneUploading] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [chatBody, setChatBody] = useState('')
  const [reviseFor, setReviseFor] = useState<string | null>(null)
  const [revisionReason, setRevisionReason] = useState('')
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(
    null,
  )
  const [showLandEdit, setShowLandEdit] = useState(false)
  const [showTaskComposer, setShowTaskComposer] = useState(false)
  const [showInspectionComposer, setShowInspectionComposer] = useState(false)
  const [openSection, setOpenSection] = useState<
    'workflow' | 'tasks' | 'alerts' | 'inspections' | 'chat' | 'notes' | 'drone' | 'analysis' | 'climate-history' | null
  >('climate-history')
  const [landForm, setLandForm] = useState({
    name: '',
    neighborhood: '',
    cadastralBlock: '',
    parcelNumber: '',
    sizeInDecares: '',
    latitude: '',
    longitude: '',
  })
  const [landFormError, setLandFormError] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    theme: '',
  })
  const [inspectionForm, setInspectionForm] = useState({
    title: '',
    producerId: '',
    inspectorUserId: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    description: '',
  })
  const [plannedForm, setPlannedForm] = useState<PlannedEvidenceForm>(emptyPlannedForm())
  const patchPlanned = (patch: Partial<PlannedEvidenceForm>) =>
    setPlannedForm((prev) => ({ ...prev, ...patch }))

  const landQuery = useQuery({
    queryKey: ['land', landId],
    queryFn: () => api<Land>(`/api/lands/${landId}`, {}, token),
    enabled: Boolean(token && landId),
  })

  const productionsQuery = useQuery({
    queryKey: ['land-productions', landId],
    queryFn: () => api<LandProduction[]>(`/api/lands/${landId}/productions`, {}, token),
    enabled: Boolean(token && landId),
  })

  const alertsQuery = useQuery({
    queryKey: ['land-alerts', landId],
    queryFn: () => api<LandAlert[]>(`/api/lands/${landId}/alerts`, {}, token),
    enabled: Boolean(token && landId),
  })

  const landTasksQuery = useQuery({
    queryKey: ['land-tasks', landId],
    queryFn: () => api<TaskItem[]>(`/api/lands/${landId}/tasks`, {}, token),
    enabled: Boolean(token && landId),
  })

  const notesQuery = useQuery({
    queryKey: ['land-notes', landId],
    queryFn: () => api<LandNote[]>(`/api/lands/${landId}/notes`, {}, token),
    enabled: Boolean(token && landId),
  })

  const droneQuery = useQuery({
    queryKey: ['land-drone-images', landId],
    queryFn: () => tarimAi.listDroneImages({ landId: landId! }),
    enabled: Boolean(landId),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.status === 'error' ? 10_000 : false),
  })

  const landData = landQuery.data
  const analysisQuery = useQuery({
    queryKey: [
      'land-analysis',
      landId,
      landData?.city,
      landData?.district,
      landData?.neighborhood,
      landData?.cadastralBlock,
      landData?.parcelNumber,
    ],
    queryFn: async () => {
      try {
        return await tarimAi.latestLandAnalysis(landId!, {
          province: landData?.city?.trim() || 'Gaziantep',
          district: landData?.district?.trim() || 'Şehitkamil',
          neighborhood: landData?.neighborhood?.trim() || undefined,
          block: landData?.cadastralBlock?.trim() || undefined,
          parcel: landData?.parcelNumber?.trim() || undefined,
        })
      } catch (err) {
        if (err instanceof TarimAiError && err.status === 404) return null
        throw err
      }
    },
    enabled: Boolean(landId && landData),
    retry: false,
  })

  const conversationsQuery = useQuery({
    queryKey: ['land-conversations', landId],
    queryFn: () => api<ConversationListItem[]>(`/api/lands/${landId}/conversations`, {}, token),
    enabled: Boolean(token && landId),
  })

  const threadDetailQuery = useQuery({
    queryKey: ['conversation', selectedThreadId],
    queryFn: () =>
      api<ConversationDetail>(`/api/conversations/${selectedThreadId}`, {}, token),
    enabled: Boolean(token && selectedThreadId),
  })

  const workflowsQuery = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api<Workflow[]>('/api/workflows', {}, token),
    enabled: Boolean(token),
  })

  const producersQuery = useQuery({
    queryKey: ['producers'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token),
  })

  const seasonsQuery = useQuery({
    queryKey: ['seasons'],
    queryFn: () => api<Season[]>('/api/seasons', {}, token),
    enabled: Boolean(token),
  })

  const officersQuery = useQuery({
    queryKey: ['officers'],
    queryFn: () => api<StaffUser[]>('/api/users/officers', {}, token),
    enabled: Boolean(token),
  })

  const inspectionsQuery = useQuery({
    queryKey: ['inspections'],
    queryFn: () => api<Inspection[]>('/api/inspections', {}, token),
    enabled: Boolean(token),
  })

  const workflows = workflowsQuery.data ?? []
  const producers = producersQuery.data ?? []
  const seasons = seasonsQuery.data ?? []
  const productions = productionsQuery.data ?? []
  const officers = officersQuery.data ?? []
  const alerts = alertsQuery.data ?? []
  const notes = notesQuery.data ?? []
  const land = landQuery.data
  const localDronePhotos = land
    ? getDronePhotosForParcel(
        land.neighborhoodName || land.name || '',
        land.cadastralBlock || (land as any).block || '',
        land.parcelNumber || (land as any).parcel || '',
      )
    : []
  const droneImages = [
    ...localDronePhotos.map((p, idx) => ({
      id: `local-drone-${idx}`,
      landId: land?.id ?? '',
      landName: land?.name ?? 'Arazi',
      imageUrl: p.url,
      capturedAt: '2026-08-04',
      fileName: p.title,
      contentType: 'image/jpeg',
      createdAt: '2026-08-04T12:00:00Z',
    })),
    ...(droneQuery.data?.items ?? []),
  ]
  const droneLightboxImages: LightboxImage[] = droneImages.flatMap((item) => {
    const src = resolveTarimAiAssetUrl(item.imageUrl)
    if (!src) return []
    return [
      {
        src,
        alt: item.fileName || item.landName || 'Drone görüntüsü',
        caption: [
          item.capturedAt
            ? new Date(`${item.capturedAt}T00:00:00`).toLocaleDateString('tr-TR')
            : null,
          item.fileName,
        ]
          .filter(Boolean)
          .join(' · '),
      } satisfies LightboxImage,
    ]
  })
  const landThreads = conversationsQuery.data ?? []
  const landTasks = landTasksQuery.data ?? []
  const landInspections = (inspectionsQuery.data ?? []).filter((i) => i.landId === landId)
  const unreadChatCount = landThreads.filter((t) => t.hasUnread).length
  const awaitingCount = landTasks.filter((t) => t.status === 5).length
  const activeProduction = productions.find((p) => p.status === 1) ?? productions[0] ?? null

  const selectedWorkflow = workflows.find((w) => w.id === plan.workflowId)

  const producerName = (id?: string) =>
    id ? (producers.find((p) => p.id === id)?.fullName ?? id.slice(0, 8)) : '—'

  const officerName = (id?: string) =>
    id ? (officers.find((o) => o.id === id)?.fullName ?? id.slice(0, 8)) : '—'

  const startProduction = useMutation({
    mutationFn: () =>
      api(
        '/api/workflows/assign',
        {
          method: 'POST',
          body: JSON.stringify({
            seasonId: plan.seasonId,
            workflowId: plan.workflowId,
            producerId: plan.producerId || land?.producerId,
            landId,
          }),
        },
        token,
      ),
    onSuccess: async () => {
      setPlan({ workflowId: '', seasonId: '', producerId: '' })
      await invalidateLand()
    },
  })

  const reassign = useMutation({
    mutationFn: () =>
      api(
        `/api/workflows/productions/${reassignFor}/producer`,
        {
          method: 'PUT',
          body: JSON.stringify({ producerId: reassignProducerId }),
        },
        token,
      ),
    onSuccess: async () => {
      setReassignFor(null)
      setReassignProducerId('')
      await invalidateLand()
    },
  })

  const saveAssignments = useMutation({
    mutationFn: () => {
      const producerId = assignForm.producerId || landQuery.data?.producerId || null
      const officerUserId =
        assignForm.officerUserId || landQuery.data?.assignedOfficerUserId || null
      return api(
        `/api/lands/${landId}/assignments`,
        {
          method: 'PUT',
          body: JSON.stringify({
            producerId,
            officerUserId,
          }),
        },
        token,
      )
    },
    onSuccess: async () => {
      await invalidateLand()
    },
  })

  const saveLand = useMutation({
    mutationFn: () => {
      const coords = parseOptionalCoordinates(landForm.latitude, landForm.longitude)
      if (!coords.ok) {
        return Promise.reject(new Error(coords.message))
      }
      return api(
        `/api/lands/${landId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: landForm.name.trim(),
            parcelNumber: landForm.parcelNumber.trim(),
            neighborhood: landForm.neighborhood.trim() || null,
            sizeInDecares: Number(landForm.sizeInDecares),
            cadastralBlock: landForm.cadastralBlock.trim() || null,
            // Optional map pin; invalid/corrupt stored values are sent as null (cleared).
            latitude: coords.latitude,
            longitude: coords.longitude,
            soilType: land?.soilType ?? null,
            soilNotes: land?.soilNotes ?? null,
          }),
        },
        token,
      )
    },
    onSuccess: async () => {
      setLandFormError(null)
      setShowLandEdit(false)
      await invalidateLand()
    },
  })

  const addNote = useMutation({
    mutationFn: () =>
      api(
        `/api/lands/${landId}/notes`,
        { method: 'POST', body: JSON.stringify({ body: noteBody }) },
        token,
      ),
    onSuccess: async () => {
      setNoteBody('')
      await queryClient.invalidateQueries({ queryKey: ['land-notes', landId] })
    },
  })

  const sendLandChat = useMutation({
    mutationFn: () =>
      api(
        `/api/lands/${landId}/conversations/${selectedThreadId}/messages`,
        { method: 'POST', body: JSON.stringify({ body: chatBody }) },
        token,
      ),
    onSuccess: async () => {
      setChatBody('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['conversation', selectedThreadId] }),
        queryClient.invalidateQueries({ queryKey: ['land-conversations', landId] }),
      ])
    },
  })

  const approveLandTask = useMutation({
    mutationFn: (taskId: string) =>
      api(`/api/tasks/${taskId}/approve`, { method: 'POST' }, token),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['land-tasks', landId] }),
        queryClient.invalidateQueries({ queryKey: ['land-alerts', landId] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ])
    },
  })

  const reviseLandTask = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      api(
        `/api/tasks/${taskId}/reject`,
        { method: 'POST', body: JSON.stringify({ reason }) },
        token,
      ),
    onSuccess: async () => {
      setReviseFor(null)
      setRevisionReason('')
      await invalidateTaskActions()
    },
  })

  const cancelLandTask = useMutation({
    mutationFn: (taskId: string) =>
      api(`/api/tasks/${taskId}/cancel`, { method: 'POST' }, token),
    onSuccess: invalidateTaskActions,
  })

  const sendLandTask = useMutation({
    mutationFn: () => {
      const dueDate = normalizeDateOnly(taskForm.dueDate)
      if (!taskForm.theme) {
        return Promise.reject(new Error('İşlem teması seçin.'))
      }
      const plannedEvidence = buildPlannedEvidence(taskForm.theme, plannedForm)
      const plannedErr = validatePlannedEvidence(taskForm.theme, plannedEvidence)
      if (plannedErr) {
        return Promise.reject(new Error(plannedErr))
      }
      return api(
        `/api/lands/${landId}/tasks`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: taskForm.title.trim(),
            description: taskForm.description.trim() || null,
            dueDate,
            theme: taskForm.theme,
            plannedEvidence,
          }),
        },
        token,
      )
    },
    onSuccess: async () => {
      setTaskForm({ title: '', description: '', dueDate: '', theme: '' })
      setPlannedForm(emptyPlannedForm())
      setShowTaskComposer(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['land-tasks', landId] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['land-alerts', landId] }),
        queryClient.invalidateQueries({ queryKey: ['land', landId] }),
      ])
      window.setTimeout(() => sendLandTask.reset(), 2500)
    },
  })

  const createLandInspection = useMutation({
    mutationFn: () =>
      api(
        '/api/inspections',
        {
          method: 'POST',
          body: JSON.stringify({
            title: inspectionForm.title.trim(),
            landId,
            producerId: inspectionForm.producerId || land?.producerId,
            inspectorUserId:
              inspectionForm.inspectorUserId ||
              land?.assignedOfficerUserId ||
              user?.userId,
            scheduledDate: inspectionForm.scheduledDate,
            description: inspectionForm.description.trim() || null,
            seasonId: null,
            productionWorkflowId: null,
          }),
        },
        token,
      ),
    onSuccess: async () => {
      setInspectionForm({
        title: '',
        producerId: land?.producerId ?? '',
        inspectorUserId: land?.assignedOfficerUserId ?? '',
        scheduledDate: new Date().toISOString().slice(0, 10),
        description: '',
      })
      setShowInspectionComposer(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inspections'] }),
        queryClient.invalidateQueries({ queryKey: ['operations-center'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ])
      window.setTimeout(() => createLandInspection.reset(), 2500)
    },
  })

  useEffect(() => {
    const threads = conversationsQuery.data
    if (!selectedThreadId && threads && threads.length > 0) {
      setSelectedThreadId(threads[0].id)
    }
  }, [conversationsQuery.data, selectedThreadId])

  useEffect(() => {
    const landData = landQuery.data
    if (!landData) return
    setAssignForm({
      producerId: landData.producerId ?? '',
      officerUserId: landData.assignedOfficerUserId ?? '',
    })
    setLandForm({
      name: landData.name ?? '',
      neighborhood: landData.neighborhood ?? '',
      cadastralBlock: landData.cadastralBlock ?? '',
      parcelNumber: landData.parcelNumber ?? '',
      sizeInDecares: landData.sizeInDecares != null ? String(landData.sizeInDecares) : '',
      // Only show valid map coords — ada/parsel mistaken as lat must not re-post.
      latitude: formatLatitudeInput(landData.latitude),
      longitude: formatLongitudeInput(landData.longitude),
    })
    setLandFormError(null)
    setInspectionForm((prev) => ({
      ...prev,
      producerId: landData.producerId ?? prev.producerId,
      inspectorUserId: landData.assignedOfficerUserId ?? prev.inspectorUserId,
    }))
  }, [landQuery.data])

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.replace('#', '')
    if (id === 'uretim') setOpenSection('workflow')
    if (id === 'gorevler') setOpenSection('tasks')
    if (id === 'uyarilar') setOpenSection('alerts')
    if (id === 'denetimler') setOpenSection('inspections')
    if (id === 'sohbet') setOpenSection('chat')
    if (id === 'notlar') setOpenSection('notes')
    if (id === 'arazi-analizi' || id === 'analiz') setOpenSection('analysis')
    if (id === 'iklim-gecmisi' || id === 'iklim' || id === 'yagis-grafik') setOpenSection('climate-history')
    if (id === 'drone' || id === 'drone-goruntuler' || id === 'drone-gorseller') {
      setOpenSection('drone')
    }    if (id === 'arazi-bilgileri') {
      setOpenSection(null)
      setShowLandEdit(true)
    }
    // Modaller içerikte render edildiği için sayfa kaydırmayı tetiklememek gerekir.
    if (['uretim', 'gorevler', 'denetimler', 'sohbet', 'notlar'].includes(id)) return
    requestAnimationFrame(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.hash, landQuery.data, landTasksQuery.data, conversationsQuery.data])

  function toggleSection(
    section: 'workflow' | 'tasks' | 'alerts' | 'inspections' | 'chat' | 'notes' | 'drone' | 'analysis' | 'climate-history',
  ) {
    setShowLandEdit(false)
    setOpenSection((current) => (current === section ? null : section))
  }

  function toggleLandEdit() {
    setOpenSection(null)
    setShowLandEdit((v) => !v)
  }

  async function invalidateLand() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['land', landId] }),
      queryClient.invalidateQueries({ queryKey: ['land-productions', landId] }),
      queryClient.invalidateQueries({ queryKey: ['land-alerts', landId] }),
      queryClient.invalidateQueries({ queryKey: ['land-tasks', landId] }),
      queryClient.invalidateQueries({ queryKey: ['land-conversations', landId] }),
      queryClient.invalidateQueries({ queryKey: ['lands'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['operations-center'] }),
    ])
  }

  async function invalidateTaskActions() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['land-tasks', landId] }),
      queryClient.invalidateQueries({ queryKey: ['land-alerts', landId] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['pending-approval'] }),
    ])
  }

  function onStart(e: FormEvent) {
    e.preventDefault()
    const producerId = plan.producerId || land?.producerId
    if (!plan.workflowId || !plan.seasonId || !producerId) return
    startProduction.mutate()
  }

  function onSaveLand(e: FormEvent) {
    e.preventDefault()
    setLandFormError(null)
    if (
      !landForm.name.trim() ||
      !landForm.parcelNumber.trim() ||
      !landForm.sizeInDecares.trim()
    ) {
      return
    }
    const coords = parseOptionalCoordinates(landForm.latitude, landForm.longitude)
    if (!coords.ok) {
      setLandFormError(coords.message)
      return
    }
    saveLand.mutate()
    if (admin) {
      const producerId = assignForm.producerId || land?.producerId
      const officerUserId = assignForm.officerUserId || land?.assignedOfficerUserId
      if (producerId || officerUserId) saveAssignments.mutate()
    }
  }

  if (landQuery.isLoading) {
    return (
      <section>
        <p className="empty">Yükleniyor…</p>
      </section>
    )
  }

  if (landQuery.error || !land) {
    return (
      <section>
        <Link to="/lands" className="land-back-chip" style={{ marginBottom: 12 }}>
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          Arazilere geri dön
        </Link>
        <p className="error empty">
          {(landQuery.error as Error)?.message ?? 'Arazi bulunamadı.'}
        </p>
      </section>
    )
  }

  const canEditOps = admin || officer
  const cropLabel =
    land.activeCropType?.trim() ||
    activeProduction?.cropType?.trim() ||
    activeProduction?.workflowName?.trim() ||
    null
  const alertCount = alerts.length || land.alertCount || 0

  function taskOriginLabel(task: TaskItem) {
    return task.videoUrl || task.imageUrl ? 'Şablon adımı' : 'Manuel görev'
  }

  const sizeLabel =
    land.sizeInDecares != null ? `${land.sizeInDecares} dönüm` : '—'

  return (
    <section className="land-detail-page">
      <Link to="/lands" className="land-back-chip">
        <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
        Arazilere geri dön
      </Link>

      <div className="land-hero-card" id="arazi-bilgileri">
        <div className="land-hero-top">
          <div className="land-hero-title-block">
            <div className="land-hero-icon" aria-hidden>
              <Map size={22} strokeWidth={1.75} />
            </div>
            <div className="land-hero-heading">
              <h1>{land.name}</h1>
              <p className="land-hero-location">
                <span>
                  <MapPin size={15} strokeWidth={1.75} aria-hidden />
                  {land.neighborhood || '—'}
                </span>
                <span>
                  <Map size={15} strokeWidth={1.75} aria-hidden />
                  Ada {land.cadastralBlock || '—'}
                </span>
                <span>
                  <Scan size={15} strokeWidth={1.75} aria-hidden />
                  Parsel {land.parcelNumber || '—'}
                </span>
              </p>
            </div>
          </div>
          <div className="land-hero-actions">
            {alertCount > 0 ? (
              <button
                type="button"
                className={`land-alert-icon-btn${openSection === 'alerts' ? ' is-open' : ''}`}
                onClick={() => toggleSection('alerts')}
                aria-expanded={openSection === 'alerts'}
                aria-label={`${alertCount} uyarı`}
                title={`${alertCount} uyarı`}
              >
                <AlertTriangle size={18} strokeWidth={1.75} />
              </button>
            ) : null}
            {canEditOps ? (
              <button
                type="button"
                className={`land-edit-btn${showLandEdit ? ' is-open' : ''}`}
                onClick={toggleLandEdit}
                aria-expanded={showLandEdit}
                title="Arazi bilgilerini düzenle"
              >
                <Pencil size={15} strokeWidth={1.75} aria-hidden />
                Düzenle
              </button>
            ) : null}
          </div>
        </div>

        <div className="land-hero-meta">
          <div className="land-hero-meta-item">
            <UserRound size={16} strokeWidth={1.75} aria-hidden />
            <div>
              <span className="land-hero-meta-label">Üretici</span>
              <strong>{producerName(land.producerId)}</strong>
            </div>
          </div>
          <div className="land-hero-meta-item">
            <UserCog size={16} strokeWidth={1.75} aria-hidden />
            <div>
              <span className="land-hero-meta-label">Uzman</span>
              <strong>{officerName(land.assignedOfficerUserId)}</strong>
            </div>
          </div>
          <div className="land-hero-meta-item">
            <Sprout size={16} strokeWidth={1.75} aria-hidden />
            <div>
              <span className="land-hero-meta-label">Ürün</span>
              <strong>{cropLabel || '—'}</strong>
            </div>
          </div>
          <div className="land-hero-meta-item">
            <Scan size={16} strokeWidth={1.75} aria-hidden />
            <div>
              <span className="land-hero-meta-label">Arazi büyüklüğü</span>
              <strong>{sizeLabel}</strong>
            </div>
          </div>
        </div>

        {canEditOps && showLandEdit && (
          <div className="land-edit-box">
            <form className="form-grid two-col" onSubmit={onSaveLand}>
              <label>
                Ad
                <input
                  value={landForm.name}
                  onChange={(e) => setLandForm({ ...landForm, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Mahalle
                <select
                  value={landForm.neighborhood}
                  onChange={(e) => setLandForm({ ...landForm, neighborhood: e.target.value })}
                >
                  <option value="">Mahalle seçin</option>
                  {neighborhoodSelectOptions(landForm.neighborhood).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ada
                <input
                  value={landForm.cadastralBlock}
                  onChange={(e) => setLandForm({ ...landForm, cadastralBlock: e.target.value })}
                  placeholder="Ada no"
                />
              </label>
              <label>
                Parsel
                <input
                  value={landForm.parcelNumber}
                  onChange={(e) => setLandForm({ ...landForm, parcelNumber: e.target.value })}
                  required
                />
              </label>
              <label>
                Dönüm
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={landForm.sizeInDecares}
                  onChange={(e) => setLandForm({ ...landForm, sizeInDecares: e.target.value })}
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
                  value={landForm.latitude}
                  onChange={(e) => {
                    setLandFormError(null)
                    setLandForm({ ...landForm, latitude: e.target.value })
                  }}
                  placeholder="ör. 37.08"
                  aria-describedby="land-coord-hint"
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
                  value={landForm.longitude}
                  onChange={(e) => {
                    setLandFormError(null)
                    setLandForm({ ...landForm, longitude: e.target.value })
                  }}
                  placeholder="ör. 37.38"
                  aria-describedby="land-coord-hint"
                />
              </label>
              <span id="land-coord-hint" className="muted-copy full-span" style={{ margin: 0 }}>
                Enlem −90…90, boylam −180…180 (Şehitkamil örneği: 37.08, 37.38).
              </span>
              {admin ? (
                <>
                  <label>
                    Üretici
                    <select
                      value={assignForm.producerId}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, producerId: e.target.value })
                      }
                    >
                      <option value="">Seçin</option>
                      {producers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tarım Uzmanı
                    <select
                      value={assignForm.officerUserId}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, officerUserId: e.target.value })
                      }
                    >
                      <option value="">Seçin</option>
                      {officers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              {(landFormError || saveLand.error || saveAssignments.error) && (
                <p className="error full-span">
                  {landFormError ??
                    ((saveLand.error ?? saveAssignments.error) as Error).message}
                </p>
              )}
              {(saveLand.isSuccess || saveAssignments.isSuccess) && (
                <p className="success-inline">Kaydedildi.</p>
              )}
              <div className="row-actions full-span">
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={saveLand.isPending || saveAssignments.isPending}
                >
                  {saveLand.isPending || saveAssignments.isPending
                    ? 'Kaydediliyor…'
                    : 'Kaydet'}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setShowLandEdit(false)}
                >
                  Kapat
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <nav className="land-action-bar" aria-label="Arazi işlemleri">
        {canEditOps ? (
          <button
            type="button"
            className={`land-action-chip land-action-chip-workflow${openSection === 'workflow' ? ' is-active' : ''}`}
            onClick={() => toggleSection('workflow')}
          >
            <WorkflowIcon size={16} strokeWidth={1.75} aria-hidden />
            <span>İş akışı uygula</span>
            {openSection === 'workflow' ? (
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="land-action-chevron" />
            ) : null}
          </button>
        ) : null}
        <button
          type="button"
          className={`land-action-chip${openSection === 'tasks' ? ' is-active' : ''}`}
          onClick={() => toggleSection('tasks')}
        >
          <ClipboardList size={16} strokeWidth={1.75} aria-hidden />
          <span>Görevler</span>
          {awaitingCount > 0 ? <em>{awaitingCount}</em> : null}
        </button>
        <button
          type="button"
          className={`land-action-chip${openSection === 'inspections' ? ' is-active' : ''}`}
          onClick={() => toggleSection('inspections')}
        >
          <ShieldCheck size={16} strokeWidth={1.75} aria-hidden />
          <span>Denetimler</span>
          {landInspections.length > 0 ? <em>{landInspections.length}</em> : null}
        </button>
        <button
          type="button"
          className={`land-action-chip${openSection === 'chat' ? ' is-active' : ''}`}
          onClick={() => toggleSection('chat')}
        >
          <MessageSquare size={16} strokeWidth={1.75} aria-hidden />
          <span>Sohbet</span>
          {unreadChatCount > 0 ? <em>{unreadChatCount}</em> : null}
        </button>
        <button
          type="button"
          className={`land-action-chip${openSection === 'climate-history' ? ' is-active' : ''}`}
          onClick={() => toggleSection('climate-history')}
        >
          <BarChart2 size={16} strokeWidth={1.75} aria-hidden />
          <span>20-30 Yıllık İklim & Yağış</span>
          <em>Grafik</em>
        </button>
        <button
          type="button"
          className={`land-action-chip${openSection === 'analysis' ? ' is-active' : ''}`}
          onClick={() => toggleSection('analysis')}
        >
          <Activity size={16} strokeWidth={1.75} aria-hidden />
          <span>Arazi analizi</span>
          {analysisQuery.data ? <em>1</em> : null}
        </button>
        <button
          type="button"
          className={`land-action-chip${openSection === 'drone' ? ' is-active' : ''}`}
          onClick={() => toggleSection('drone')}
        >
          <Plane size={16} strokeWidth={1.75} aria-hidden />
          <span>Drone görüntüleri</span>
          {droneImages.length > 0 ? <em>{droneImages.length}</em> : null}
        </button>
        <button
          type="button"
          className={`land-action-chip land-action-chip-notes${openSection === 'notes' ? ' is-active' : ''}`}
          onClick={() => toggleSection('notes')}
        >
          <NotebookPen size={16} strokeWidth={1.75} aria-hidden />
          <span>Notlar</span>
          {notes.length > 0 ? <em>{notes.length}</em> : null}
        </button>
      </nav>

      {openSection === 'climate-history' && (
        <LandClimateChartCard
          landName={land?.name}
          neighborhoodName={land?.neighborhoodName}
          cadastralBlock={land?.cadastralBlock}
          parcelNumber={land?.parcelNumber}
          areaDekars={land?.areaDekars}
        />
      )}

      {openSection === 'analysis' && (
        <div className="panel land-content-panel" id="arazi-analizi">
          <div className="land-section-head land-section-head-actions">
            <p className="panel-title with-icon">
              <Activity size={16} strokeWidth={1.75} aria-hidden />
              Arazi analizi
            </p>
            {analysisQuery.data ? (
              <Link
                className="ghost-btn"
                to={`/tarim-ai?landId=${encodeURIComponent(landId!)}&analysisId=${encodeURIComponent(analysisQuery.data.analysisId)}`}
              >
                AI Destekli Analiz’de aç
              </Link>
            ) : (
              <Link className="ghost-btn" to={`/tarim-ai?landId=${encodeURIComponent(landId!)}`}>
                Analiz başlat
              </Link>
            )}
          </div>
          {analysisQuery.isLoading ? <p className="empty">Analiz yükleniyor…</p> : null}
          {!analysisQuery.isLoading && !analysisQuery.data ? (
            <p className="empty">
              Bu arazi için henüz kayıtlı analiz yok. AI Destekli Analiz sayfasından bu araziyi seçip analiz
              çalıştırın; sonuç burada saklanır.
            </p>
          ) : null}
          {analysisQuery.data ? (
            <div className="land-analysis-summary">
              <div className="land-analysis-grid">
                <div>
                  <span className="land-hero-meta-label">Durum</span>
                  <strong>
                    {analysisQuery.data.status === 'completed'
                      ? 'Tamamlandı'
                      : analysisQuery.data.status === 'partial_completed'
                        ? 'Tamamlandı (kısmi)'
                        : analysisQuery.data.status}
                  </strong>
                </div>
                <div>
                  <span className="land-hero-meta-label">Kullanılabilirlik</span>
                  <strong>
                    {analysisQuery.data.summary.landUsabilityClassification?.replaceAll('_', ' ') ||
                      '—'}
                  </strong>
                </div>
                <div>
                  <span className="land-hero-meta-label">Skor</span>
                  <strong>
                    {analysisQuery.data.summary.landUsabilityScore != null
                      ? analysisQuery.data.summary.landUsabilityScore
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span className="land-hero-meta-label">Güven</span>
                  <strong>{analysisQuery.data.summary.confidenceLevel || '—'}</strong>
                </div>
                <div>
                  <span className="land-hero-meta-label">NDVI ort.</span>
                  <strong>
                    {analysisQuery.data.summary.ndviMean != null
                      ? analysisQuery.data.summary.ndviMean.toFixed(3)
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span className="land-hero-meta-label">Tarih</span>
                  <strong>
                    {analysisQuery.data.completedAt
                      ? new Date(analysisQuery.data.completedAt).toLocaleString('tr-TR')
                      : '—'}
                  </strong>
                </div>
              </div>
              {analysisQuery.data.summary.topCrops.length > 0 ? (
                <div className="land-analysis-crops">
                  <span className="land-hero-meta-label">Önerilen ürünler</span>
                  <ul>
                    {analysisQuery.data.summary.topCrops.map((crop) => (
                      <li key={`${crop.rank}-${crop.cropName}`}>
                        #{crop.rank} {crop.cropName}
                        {typeof crop.score === 'number' ? ` · ${crop.score.toFixed(1)}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="muted-copy" style={{ padding: '8px 0 0' }}>
                Parsel:{' '}
                {[
                  analysisQuery.data.parcel.province,
                  analysisQuery.data.parcel.district,
                  analysisQuery.data.parcel.neighborhood,
                  `${analysisQuery.data.parcel.block}/${analysisQuery.data.parcel.parcel}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {openSection === 'drone' && (
        <div className="panel land-content-panel land-drone-panel" id="drone-goruntuler">
          <div className="land-section-head land-section-head-actions">
            <p className="panel-title with-icon">
              <Plane size={16} strokeWidth={1.75} aria-hidden />
              Drone görüntüleri
              {droneImages.length > 0 ? (
                <span className="land-section-count">{droneImages.length}</span>
              ) : null}
            </p>
            <div className="row-actions">
              {droneQuery.isError ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => void droneQuery.refetch()}
                >
                  Tekrar dene
                </button>
              ) : null}
              <button type="button" className="ghost-btn" onClick={() => setOpenSection(null)}>
                Kapat
              </button>
            </div>
          </div>

          <p className="muted-copy">Çekim tarihini girip araziye ait drone görüntüsü ekleyin.</p>

          {land ? (
            <form
              className="land-drone-upload"
              onSubmit={async (e: FormEvent) => {
                e.preventDefault()
                setDroneUploadError(null)
                if (!droneCapturedAt.trim()) {
                  setDroneUploadError('Çekim tarihi zorunlu.')
                  return
                }
                if (!droneFile) {
                  setDroneUploadError('Görüntü seçin.')
                  return
                }
                if (!droneFile.type.startsWith('image/')) {
                  setDroneUploadError('Yalnızca görüntü dosyası yükleyebilirsiniz.')
                  return
                }
                setDroneUploading(true)
                try {
                  const dataBase64 = await fileToBase64(droneFile)
                  await tarimAi.uploadDroneImage({
                    capturedAt: droneCapturedAt,
                    fileName: droneFile.name,
                    contentType: droneFile.type || 'image/jpeg',
                    dataBase64,
                    landId: land.id,
                    landName: land.name,
                    parcelQuery: {
                      province: land.city?.trim() || 'Gaziantep',
                      district: land.district?.trim() || 'Şehitkamil',
                      neighborhood: land.neighborhood?.trim() || '—',
                      block: land.cadastralBlock?.trim() || '—',
                      parcel: land.parcelNumber?.trim() || '—',
                    },
                  })
                  setDroneFile(null)
                  setDroneFileKey((k) => k + 1)
                  setDroneCapturedAt(new Date().toISOString().slice(0, 10))
                  await queryClient.invalidateQueries({ queryKey: ['land-drone-images', landId] })
                  await queryClient.invalidateQueries({ queryKey: ['tarim-ai', 'drone-images'] })
                } catch (err) {
                  setDroneUploadError(
                    err instanceof TarimAiError
                      ? err.message
                      : err instanceof Error
                        ? err.message
                        : 'Yükleme başarısız.',
                  )
                } finally {
                  setDroneUploading(false)
                }
              }}
            >
              <p className="land-drone-upload-heading">Yeni görüntü</p>
              <div className="land-drone-upload-fields">
                <label className="land-drone-field">
                  <span>
                    Çekim tarihi <em>*</em>
                  </span>
                  <input
                    type="date"
                    required
                    value={droneCapturedAt}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDroneCapturedAt(e.target.value)}
                    disabled={droneUploading}
                  />
                </label>
                <label className="land-drone-field land-drone-file-field">
                  <span>
                    Görüntü <em>*</em>
                  </span>
                  <span className="land-drone-file-control">
                    <input
                      key={droneFileKey}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp"
                      required
                      onChange={(e) => setDroneFile(e.target.files?.[0] ?? null)}
                      disabled={droneUploading}
                    />
                    <span className="land-drone-file-btn" aria-hidden>
                      <Plus size={14} strokeWidth={2} />
                      Dosya seç
                    </span>
                    <span className="land-drone-file-name">
                      {droneFile ? droneFile.name : 'Dosya seçilmedi'}
                    </span>
                  </span>
                </label>
              </div>
              {droneUploadError ? <p className="error land-drone-upload-error">{droneUploadError}</p> : null}
              <div className="land-drone-upload-actions">
                <button type="submit" className="primary-btn" disabled={droneUploading}>
                  {droneUploading ? 'Yükleniyor…' : 'Görüntü ekle'}
                </button>
              </div>
            </form>
          ) : null}

          {droneQuery.isLoading ? <p className="empty">Görüntüler yükleniyor…</p> : null}
          {droneQuery.isError ? (
            <p className="error empty">
              Drone görüntüleri alınamadı. AI Destekli Analiz servisi (
              <code className="tai-code">:4000</code>) çalışıyor mu kontrol edin.
            </p>
          ) : null}
          {!droneQuery.isLoading && !droneQuery.isError && droneImages.length === 0 ? (
            <div className="land-empty-state">
              <div className="land-empty-icon" aria-hidden>
                <Plane size={24} strokeWidth={1.5} />
              </div>
              <p>Henüz drone görüntüsü yok. Çekim tarihiyle birlikte ekleyin.</p>
            </div>
          ) : null}
          {droneLightboxImages.length > 0 ? (
            <div className="land-drone-grid">
              {droneLightboxImages.map((image, index) => (
                <button
                  key={`${image.src}-${index}`}
                  type="button"
                  className="land-drone-thumb"
                  onClick={() => setLightbox({ images: droneLightboxImages, index })}
                >
                  <img src={image.src} alt={image.alt ?? 'Drone görüntüsü'} loading="lazy" />
                  {image.caption ? <span>{image.caption}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {openSection === 'alerts' && alertCount > 0 && (
        <div className="panel land-content-panel land-alerts-panel" id="uyarilar">
          <div className="land-alerts-head">
            <p className="panel-title land-alerts-title">
              <AlertTriangle size={16} strokeWidth={1.75} aria-hidden />
              Uyarılar
              <span className="land-section-count">{alerts.length}</span>
            </p>
            <button type="button" className="ghost-btn" onClick={() => setOpenSection(null)}>
              Kapat
            </button>
          </div>
          <ul className="land-alerts-list">
            {alerts.map((a) => (
              <li key={a.id}>
                <strong>{a.title?.trim() || 'Görev adımı'}</strong>
                <span>
                  Bilgi bekleniyor
                  {a.dueDate
                    ? ` · Son tarih ${new Date(a.dueDate).toLocaleDateString('tr-TR')}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canEditOps && openSection === 'workflow' && (
        <LandActionModal ariaLabel="İş akışı uygula" onClose={() => setOpenSection(null)}>
          <div className="panel land-content-panel land-plan-panel" id="uretim">
          <div className="land-inline-head land-inline-head-spaced">
            <div>
              {selectedWorkflow ? (
                <>
                  <p className="panel-title">İş akışı uygula</p>
                  <p className="muted-copy">
                    Seçip başlatın. Şablon için <Link to="/workflows">İş akışları</Link>{' '}
                    sayfasını kullanın.
                  </p>
                </>
              ) : (
                <p className="panel-title land-plan-panel-sr-title">İş akışı uygula</p>
              )}
            </div>
            <button type="button" className="ghost-btn" onClick={() => setOpenSection(null)}>
              Kapat
            </button>
          </div>

          {!selectedWorkflow ? (
            <div className="land-workflow-empty">
              <div className="land-empty-icon" aria-hidden>
                <Layers size={28} strokeWidth={1.5} />
              </div>
              <h2>İş akışı seçin</h2>
              <p>
                Bir iş akışı seçerek araziye uygulanacak adımları görüntüleyin.
              </p>
            </div>
          ) : null}

          <form className={`form-grid${selectedWorkflow ? '' : ' land-plan-form-compact'}`} onSubmit={onStart}>
            <div className="workflow-meta-grid">
              <label>
                Sezon
                <select
                  value={plan.seasonId}
                  onChange={(e) => setPlan({ ...plan, seasonId: e.target.value })}
                  required
                >
                  <option value="">Seçin</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Şablon
              <select
                value={plan.workflowId}
                onChange={(e) => setPlan({ ...plan, workflowId: e.target.value })}
                required
              >
                <option value="">Seçin</option>
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.cropType ? ` · ${w.cropType}` : ''}
                    {` · ${w.steps.length} adım`}
                  </option>
                ))}
              </select>
            </label>

            {selectedWorkflow && (
              <div className="land-step-preview">
                <strong>
                  {selectedWorkflow.steps.length} adım
                  {selectedWorkflow.cropType ? ` · ${selectedWorkflow.cropType}` : ''}
                </strong>
                <ol>
                  {[...selectedWorkflow.steps]
                    .sort((a, b) => a.order - b.order)
                    .slice(0, 5)
                    .map((s, i, arr) => {
                      const day = s.dueDaysFromStart ?? 0
                      const prev = i > 0 ? (arr[i - 1].dueDaysFromStart ?? 0) : null
                      const gap = prev != null ? day - prev : null
                      return (
                        <li key={s.id ?? `${s.order}-${s.name}`}>
                          {s.name}
                          {` · gün ${day}`}
                          {gap != null && gap > 0 ? ` (+${gap})` : ''}
                        </li>
                      )
                    })}
                </ol>
                {selectedWorkflow.steps.length > 5 ? (
                  <p className="muted-copy">Devamı için İş akışları sayfasını açın.</p>
                ) : null}
              </div>
            )}

            <label>
              Üretici
              {land.producerId ? ' (atanmış)' : ''}
              <select
                value={plan.producerId || land.producerId || ''}
                onChange={(e) => setPlan({ ...plan, producerId: e.target.value })}
                required={!land.producerId}
              >
                <option value="">Seçin</option>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </label>

            {startProduction.error && (
              <p className="error">{(startProduction.error as Error).message}</p>
            )}
            {startProduction.isSuccess && (
              <p className="success-inline">Üretim başlatıldı; görevler oluşturuldu.</p>
            )}

            <div className="row-actions">
              <button
                className="primary-btn"
                type="submit"
                disabled={
                  startProduction.isPending ||
                  !plan.workflowId ||
                  !plan.seasonId ||
                  !(plan.producerId || land.producerId)
                }
              >
                {startProduction.isPending ? 'Başlatılıyor…' : 'Bu arazi için planı başlat'}
              </button>
            </div>
          </form>

          {(productions.length > 0 || productionsQuery.isLoading || selectedWorkflow) && (
          <div className="land-applied-flows">
            <p className="land-applied-flows-title">Uygulanan iş akışları</p>
            {productionsQuery.isLoading ? (
              <p className="empty">Yükleniyor…</p>
            ) : productions.length === 0 ? (
              <div className="land-empty-state">
                <div className="land-empty-icon" aria-hidden>
                  <Layers size={24} strokeWidth={1.5} />
                </div>
                <p>Henüz üretim yok.</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Şablon</th>
                    <th>Ürün</th>
                    <th>Üretici</th>
                    <th>Durum</th>
                    <th>Adımlar</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {productions.map((p) => (
                    <tr key={p.id}>
                      <td>{p.workflowName}</td>
                      <td>{p.cropType ?? '—'}</td>
                      <td>{producerName(p.producerId)}</td>
                      <td>
                        <span className="badge">
                          {PRODUCTION_WORKFLOW_STATUS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td>
                        {p.currentStepOrder}/{p.stepCount || '—'}
                      </td>
                      <td>
                        {canEditOps &&
                          (reassignFor === p.id ? (
                            <div className="reassign-inline">
                              <select
                                value={reassignProducerId}
                                onChange={(e) => setReassignProducerId(e.target.value)}
                              >
                                <option value="">Üretici seçin</option>
                                {producers.map((pr) => (
                                  <option key={pr.id} value={pr.id}>
                                    {pr.fullName}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="primary-btn"
                                disabled={!reassignProducerId || reassign.isPending}
                                onClick={() => reassign.mutate()}
                              >
                                Kaydet
                              </button>
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() => {
                                  setReassignFor(null)
                                  setReassignProducerId('')
                                }}
                              >
                                Vazgeç
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => {
                                setReassignFor(p.id)
                                setReassignProducerId(p.producerId)
                              }}
                            >
                              Üreticiyi değiştir
                            </button>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {reassign.error && (
              <p className="error empty">{(reassign.error as Error).message}</p>
            )}
          </div>
          )}
          </div>
        </LandActionModal>
      )}

      {openSection === 'tasks' && (
      <LandActionModal ariaLabel="Görevler" onClose={() => setOpenSection(null)}>
      <div className="panel land-content-panel land-tasks-panel" id="gorevler">
        <div className="land-section-head land-section-head-actions">
          <p className="panel-title with-icon">
            <ClipboardList size={16} strokeWidth={1.75} aria-hidden />
            Görevler
            {awaitingCount > 0 ? (
              <span className="badge badge-warn">{awaitingCount} onay bekliyor</span>
            ) : null}
          </p>
          <div className="row-actions">
            {awaitingCount > 0 ? (
              <Link to="/approvals" className="ghost-btn">
                Onay bekleyenleri aç
              </Link>
            ) : null}
            {canEditOps ? (
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowTaskComposer((v) => !v)}
                aria-expanded={showTaskComposer}
              >
                <Plus size={16} />
                {showTaskComposer ? 'Görev eklemeyi gizle' : 'Görev ekle'}
                {showTaskComposer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            ) : null}
            <button type="button" className="ghost-btn" onClick={() => setOpenSection(null)}>
              Kapat
            </button>
          </div>
        </div>

        {canEditOps && showTaskComposer && (
          <form
            className="land-task-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!taskForm.title.trim() || !taskForm.theme) return
              sendLandTask.mutate()
            }}
          >
            <p className="land-task-form-heading">Yeni görev</p>
            <div className="land-task-fields">
              <label className="land-task-field">
                <span>Görev başlığı</span>
                <input
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Örn. Sabah sulaması"
                  required
                />
              </label>
              <label className="land-task-field">
                <span>İşlem teması</span>
                <select
                  value={taskForm.theme}
                  onChange={(e) => {
                    setTaskForm({ ...taskForm, theme: e.target.value })
                    setPlannedForm(emptyPlannedForm())
                  }}
                  required
                >
                  <option value="">Tema seçin…</option>
                  {TASK_THEMES.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {taskForm.theme ? (
                  <span className="land-task-theme-hint">
                    Üretici kanıtı: {themeEvidenceHint(taskForm.theme)}
                  </span>
                ) : null}
              </label>
              {taskForm.theme ? (
                <PlannedEvidenceFields
                  theme={taskForm.theme}
                  form={plannedForm}
                  onChange={patchPlanned}
                />
              ) : null}
              <label className="land-task-field">
                <span>
                  Açıklama <em>(isteğe bağlı)</em>
                </span>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Üreticiye kısa yönerge"
                  rows={2}
                />
              </label>
              <div className="land-task-meta">
                <label className="land-task-field">
                  <span>Son tarih</span>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  />
                </label>
              </div>
            </div>
            {sendLandTask.error && (
              <p className="error">{(sendLandTask.error as Error).message}</p>
            )}
            {sendLandTask.isSuccess && (
              <p className="success-inline">Görev üreticiye gönderildi.</p>
            )}
            {!land.producerId && (
              <p className="muted-copy land-task-hint">
                Görev göndermek için önce bu araziye üretici atayın.
              </p>
            )}
            <div className="land-task-actions">
              <button
                className="primary-btn"
                type="submit"
                disabled={sendLandTask.isPending || !land.producerId}
              >
                {sendLandTask.isPending ? 'Gönderiliyor…' : 'Görevi gönder'}
              </button>
            </div>
          </form>
        )}

        {landTasksQuery.isLoading ? (
          <p className="empty">Yükleniyor…</p>
        ) : landTasks.length === 0 ? (
          <div className="land-empty-state">
            <div className="land-empty-icon" aria-hidden>
              <Layers size={24} strokeWidth={1.5} />
            </div>
            <p>Bu arazide henüz görev yok.</p>
          </div>
        ) : (
          <div className="land-task-table-wrap">
            <table className="table land-task-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Kaynak</th>
                  <th>Vade</th>
                  <th>Durum</th>
                  <th>Foto</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {landTasks.map((t) => {
                  const awaiting = t.status === 5
                  const photo = t.photos?.[0]
                  const count = t.photoCount ?? t.photos?.length ?? 0
                  const dueLabel = t.dueDate
                    ? new Date(t.dueDate).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'
                  return (
                    <tr key={t.id} className={awaiting ? 'is-awaiting' : undefined}>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{t.title}</strong>
                          {themeLabel(t.theme) ? (
                            <span className="table-cell-sub">{themeLabel(t.theme)}</span>
                          ) : null}
                          {t.description ? (
                            <span className="table-cell-sub">{t.description}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className="table-cell-sub">{taskOriginLabel(t)}</span>
                      </td>
                      <td className="land-task-due">{dueLabel}</td>
                      <td>
                        <span
                          className={
                            awaiting
                              ? 'badge badge-warn'
                              : t.status === 2
                                ? 'badge badge-ok'
                                : 'badge'
                          }
                        >
                          {TASK_STATUS[t.status] ?? t.status}
                        </span>
                      </td>
                      <td>
                        {count > 0 && photo ? (
                          <button
                            type="button"
                            className="text-link land-task-photo-link"
                            onClick={() =>
                              setLightbox({
                                images: (t.photos ?? []).map((p) => ({
                                  src: mediaUrl(p.storageKey, token),
                                  alt: p.fileName,
                                  caption: p.fileName,
                                })),
                                index: 0,
                              })
                            }
                          >
                            {count} foto
                          </button>
                        ) : t.requiresPhoto ? (
                          <span className="table-cell-emphasis">Zorunlu</span>
                        ) : (
                          <span className="table-cell-sub">—</span>
                        )}
                      </td>
                      <td>
                        {awaiting && canEditOps ? (
                          reviseFor === t.id ? (
                            <div className="land-task-review-form">
                              <textarea
                                value={revisionReason}
                                onChange={(e) => setRevisionReason(e.target.value)}
                                rows={2}
                                placeholder="Üreticiye düzeltme notu (zorunlu)"
                              />
                              <div className="land-task-review-actions">
                                <button
                                  type="button"
                                  className="primary-btn land-task-approve-btn"
                                  disabled={!revisionReason.trim() || reviseLandTask.isPending}
                                  onClick={() =>
                                    reviseLandTask.mutate({
                                      taskId: t.id,
                                      reason: revisionReason.trim(),
                                    })
                                  }
                                >
                                  <RotateCcw size={14} aria-hidden />
                                  Revize et
                                </button>
                                <button
                                  type="button"
                                  className="ghost-btn"
                                  onClick={() => {
                                    setReviseFor(null)
                                    setRevisionReason('')
                                  }}
                                >
                                  Vazgeç
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="land-task-review-actions">
                              <button
                                type="button"
                                className="primary-btn land-task-approve-btn"
                                disabled={
                                  approveLandTask.isPending || cancelLandTask.isPending
                                }
                                onClick={() => approveLandTask.mutate(t.id)}
                              >
                                <CheckCircle2 size={14} aria-hidden />
                                Onayla
                              </button>
                              <button
                                type="button"
                                className="ghost-btn land-task-approve-btn"
                                disabled={approveLandTask.isPending || cancelLandTask.isPending}
                                onClick={() => {
                                  setReviseFor(t.id)
                                  setRevisionReason('')
                                }}
                              >
                                <RotateCcw size={14} aria-hidden />
                                Revize et
                              </button>
                              <button
                                type="button"
                                className="ghost-btn land-task-approve-btn"
                                disabled={approveLandTask.isPending || cancelLandTask.isPending}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      'Bu görevi kalıcı olarak reddetmek istediğinize emin misiniz?',
                                    )
                                  ) {
                                    cancelLandTask.mutate(t.id)
                                  }
                                }}
                              >
                                <XCircle size={14} aria-hidden />
                                Reddet
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="table-cell-sub">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {approveLandTask.error && (
          <p className="error empty">{(approveLandTask.error as Error).message}</p>
        )}
        {reviseLandTask.error && (
          <p className="error empty">{(reviseLandTask.error as Error).message}</p>
        )}
        {cancelLandTask.error && (
          <p className="error empty">{(cancelLandTask.error as Error).message}</p>
        )}
      </div>
      </LandActionModal>
      )}

      {openSection === 'inspections' && (
        <LandActionModal ariaLabel="Denetimler" onClose={() => setOpenSection(null)}>
        <div className="panel land-content-panel land-tasks-panel" id="denetimler">
          <div className="land-section-head land-section-head-actions">
            <p className="panel-title with-icon">
              <ShieldCheck size={16} strokeWidth={1.75} aria-hidden />
              Denetimler
              {landInspections.length > 0 ? (
                <span className="land-section-count">{landInspections.length}</span>
              ) : null}
            </p>
            <div className="row-actions">
              {admin ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setShowInspectionComposer((v) => !v)}
                  aria-expanded={showInspectionComposer}
                >
                  <Plus size={16} />
                  {showInspectionComposer ? 'Denetim eklemeyi gizle' : 'Denetim ekle'}
                  {showInspectionComposer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              ) : null}
              <button type="button" className="ghost-btn" onClick={() => setOpenSection(null)}>
                Kapat
              </button>
            </div>
          </div>

          {admin && showInspectionComposer && (
            <form
              className="land-task-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (
                  !inspectionForm.title.trim() ||
                  !(inspectionForm.producerId || land.producerId) ||
                  !(
                    inspectionForm.inspectorUserId ||
                    land.assignedOfficerUserId ||
                    user?.userId
                  )
                ) {
                  return
                }
                createLandInspection.mutate()
              }}
            >
              <p className="land-task-form-heading">Yeni denetim</p>
              <div className="land-task-fields">
                <label className="land-task-field">
                  <span>Başlık</span>
                  <input
                    value={inspectionForm.title}
                    onChange={(e) =>
                      setInspectionForm({ ...inspectionForm, title: e.target.value })
                    }
                    placeholder="Örn. Sulama kontrolü"
                    required
                  />
                </label>
                <label className="land-task-field">
                  <span>Tarih</span>
                  <input
                    type="date"
                    value={inspectionForm.scheduledDate}
                    onChange={(e) =>
                      setInspectionForm({ ...inspectionForm, scheduledDate: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="land-task-field">
                  <span>Arazi</span>
                  <input value={land.name} disabled readOnly />
                </label>
                <label className="land-task-field">
                  <span>Üretici</span>
                  <select
                    value={inspectionForm.producerId || land.producerId || ''}
                    onChange={(e) =>
                      setInspectionForm({ ...inspectionForm, producerId: e.target.value })
                    }
                    required
                  >
                    <option value="">Seçin</option>
                    {producers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="land-task-field">
                  <span>Atanan uzman</span>
                  <select
                    value={
                      inspectionForm.inspectorUserId || land.assignedOfficerUserId || ''
                    }
                    onChange={(e) =>
                      setInspectionForm({
                        ...inspectionForm,
                        inspectorUserId: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Seçin</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="land-task-field">
                  <span>
                    Açıklama <em>(isteğe bağlı)</em>
                  </span>
                  <textarea
                    value={inspectionForm.description}
                    onChange={(e) =>
                      setInspectionForm({ ...inspectionForm, description: e.target.value })
                    }
                    placeholder="Saha denetimi notu"
                    rows={2}
                  />
                </label>
              </div>
              {createLandInspection.error && (
                <p className="error">{(createLandInspection.error as Error).message}</p>
              )}
              {createLandInspection.isSuccess && (
                <p className="success-inline">Denetim atandı.</p>
              )}
              {!land.producerId && (
                <p className="muted-copy land-task-hint">
                  Denetim atamak için önce bu araziye üretici atayın.
                </p>
              )}
              <div className="land-task-actions">
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={createLandInspection.isPending || !land.producerId}
                >
                  {createLandInspection.isPending ? 'Atanıyor…' : 'Uzmana ata'}
                </button>
              </div>
            </form>
          )}

          {inspectionsQuery.isLoading ? (
            <p className="empty">Yükleniyor…</p>
          ) : landInspections.length === 0 ? (
            <div className="land-empty-state">
              <div className="land-empty-icon" aria-hidden>
                <Layers size={24} strokeWidth={1.5} />
              </div>
              <p>Bu arazide henüz denetim yok.</p>
            </div>
          ) : (
            <div className="land-task-table-wrap">
              <table className="table land-task-table">
                <thead>
                  <tr>
                    <th>Başlık</th>
                    <th>Tarih</th>
                    <th>Durum</th>
                    {admin ? <th>Uzman</th> : null}
                    <th>Sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {landInspections.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.title}</strong>
                      </td>
                      <td>
                        {item.scheduledDate
                          ? new Date(item.scheduledDate).toLocaleDateString('tr-TR')
                          : '—'}
                      </td>
                      <td>
                        <span className="badge">
                          {INSPECTION_STATUS[item.status] ?? item.status}
                        </span>
                      </td>
                      {admin ? (
                        <td>
                          {officers.find((o) => o.id === item.inspectorUserId)?.fullName ??
                            (item.inspectorUserId === user?.userId
                              ? 'Siz'
                              : item.inspectorUserId.slice(0, 8))}
                        </td>
                      ) : null}
                      <td>{INSPECTION_RESULT[item.result] ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {inspectionsQuery.error && (
            <p className="error empty">{(inspectionsQuery.error as Error).message}</p>
          )}
        </div>
        </LandActionModal>
      )}

      {openSection === 'chat' && (
        <LandActionModal ariaLabel="Sohbet" onClose={() => setOpenSection(null)}>
        <div className="panel land-content-panel" id="sohbet">
          <div className="land-section-head land-section-head-actions">
            <p className="panel-title with-icon">
              <MessageSquare size={16} strokeWidth={1.75} aria-hidden />
              Üretici Sohbeti
              {unreadChatCount > 0 ? (
                <span className="badge badge-warn">{unreadChatCount} yeni</span>
              ) : null}
            </p>
            <button type="button" className="ghost-btn" onClick={() => setOpenSection(null)}>
              Kapat
            </button>
          </div>
          <p className="muted-copy">
            Bu araziye ait üretici yazışmaları burada. Yönetici–uzman mesajları{' '}
            <Link to="/messages">Mesajlar</Link> panelindedir.
          </p>
          {conversationsQuery.isLoading ? (
            <p className="empty">Yükleniyor…</p>
          ) : landThreads.length === 0 ? (
            <div className="land-empty-state">
              <div className="land-empty-icon" aria-hidden>
                <Layers size={24} strokeWidth={1.5} />
              </div>
              <p>Henüz sohbet yok. Üretici mobil uygulamadan «Uzmana sor» ile başlatır.</p>
            </div>
          ) : (
            <div className="messages-layout land-chat-layout">
              <div className="thread-list">
                {landThreads.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`thread-item${selectedThreadId === t.id ? ' active' : ''}${t.hasUnread ? ' unread' : ''}`}
                    onClick={() => setSelectedThreadId(t.id)}
                  >
                    <strong>
                      {t.hasUnread ? '● ' : ''}
                      {t.subject}
                    </strong>
                    <span>{t.lastMessagePreview ?? 'Mesaj yok'}</span>
                  </button>
                ))}
              </div>
              <div className="chat-pane">
                {!selectedThreadId ? (
                  <p className="empty">Sohbet seçin.</p>
                ) : threadDetailQuery.isLoading ? (
                  <p className="empty">Yükleniyor…</p>
                ) : threadDetailQuery.error ? (
                  <p className="error empty">{(threadDetailQuery.error as Error).message}</p>
                ) : threadDetailQuery.data ? (
                  <>
                    <div className="chat-header">{threadDetailQuery.data.subject}</div>
                    <div className="chat-messages">
                      {threadDetailQuery.data.messages.length === 0 && (
                        <p className="empty">Bu sohbette henüz mesaj yok.</p>
                      )}
                      {threadDetailQuery.data.messages.map((msg: ChatMessage) => {
                        const mine = msg.senderUserId === user?.userId
                        return (
                          <div key={msg.id} className={`bubble${mine ? ' mine' : ''}`}>
                            {msg.body}
                            <time>
                              {new Date(msg.sentAtUtc).toLocaleString('tr-TR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </time>
                          </div>
                        )
                      })}
                    </div>
                    {canEditOps && (
                      <form
                        className="chat-compose"
                        onSubmit={(e) => {
                          e.preventDefault()
                          if (!chatBody.trim() || !selectedThreadId) return
                          sendLandChat.mutate()
                        }}
                      >
                        <input
                          value={chatBody}
                          onChange={(e) => setChatBody(e.target.value)}
                          placeholder="Üreticiye yanıt yazın…"
                          required
                        />
                        <button
                          className="primary-btn"
                          type="submit"
                          disabled={sendLandChat.isPending}
                        >
                          {sendLandChat.isPending ? 'Gönderiliyor…' : 'Gönder'}
                        </button>
                      </form>
                    )}
                    {sendLandChat.error && (
                      <p className="error empty">{(sendLandChat.error as Error).message}</p>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
        </LandActionModal>
      )}

      {openSection === 'notes' && (
        <LandActionModal ariaLabel="Notlar" onClose={() => setOpenSection(null)}>
        <div className="panel land-content-panel" id="notlar">
          <div className="land-section-head land-section-head-actions">
            <p className="panel-title with-icon">
              <NotebookPen size={16} strokeWidth={1.75} aria-hidden />
              Uzman Notları
              {notes.length > 0 ? (
                <span className="land-section-count">{notes.length}</span>
              ) : null}
            </p>
            <button type="button" className="ghost-btn" onClick={() => setOpenSection(null)}>
              Kapat
            </button>
          </div>
          <p className="muted-copy">Saha gözlemleri ve hatırlatmalar bu arazide saklanır.</p>
          {canEditOps && (
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault()
                if (!noteBody.trim()) return
                addNote.mutate()
              }}
            >
              <label>
                Yeni not
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={3}
                  placeholder="Saha gözlemi, hatırlatma…"
                  required
                />
              </label>
              <div className="row-actions">
                <button className="primary-btn" type="submit" disabled={addNote.isPending}>
                  {addNote.isPending ? 'Kaydediliyor…' : 'Not ekle'}
                </button>
              </div>
            </form>
          )}
          {notesQuery.isLoading ? (
            <p className="empty">Yükleniyor…</p>
          ) : notes.length === 0 ? (
            <div className="land-empty-state">
              <div className="land-empty-icon" aria-hidden>
                <Layers size={24} strokeWidth={1.5} />
              </div>
              <p>Henüz not yok.</p>
            </div>
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
        </div>
        </LandActionModal>
      )}

      {lightbox ? (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </section>
  )
}
