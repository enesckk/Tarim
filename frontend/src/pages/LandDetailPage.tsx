import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  MessageSquare,
  NotebookPen,
  PencilLine,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sprout,
  XCircle,
} from 'lucide-react'
import { api } from '../api/client'
import { mediaUrl } from '../api/media'
import type {
  ChatMessage,
  ConversationDetail,
  ConversationListItem,
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
import { PRODUCTION_WORKFLOW_STATUS, TASK_STATUS } from '../api/types'
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
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [chatBody, setChatBody] = useState('')
  const [reviseFor, setReviseFor] = useState<string | null>(null)
  const [revisionReason, setRevisionReason] = useState('')
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(
    null,
  )
  const [showLandEdit, setShowLandEdit] = useState(false)
  const [showTaskComposer, setShowTaskComposer] = useState(false)
  const [landForm, setLandForm] = useState({
    name: '',
    parcelNumber: '',
    neighborhood: '',
    sizeInDecares: '',
    soilType: '',
    soilNotes: '',
    cadastralBlock: '',
    latitude: '',
    longitude: '',
  })
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    theme: '',
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

  const workflows = workflowsQuery.data ?? []
  const producers = producersQuery.data ?? []
  const seasons = seasonsQuery.data ?? []
  const productions = productionsQuery.data ?? []
  const officers = officersQuery.data ?? []
  const alerts = alertsQuery.data ?? []
  const notes = notesQuery.data ?? []
  const landThreads = conversationsQuery.data ?? []
  const landTasks = landTasksQuery.data ?? []
  const unreadChatCount = landThreads.filter((t) => t.hasUnread).length
  const awaitingCount = landTasks.filter((t) => t.status === 5).length
  const activeTasks = landTasks.filter((t) => t.status !== 2 && t.status !== 4 && t.status !== 5)
  const activeProduction = productions.find((p) => p.status === 1) ?? productions[0] ?? null

  const selectedWorkflow = workflows.find((w) => w.id === plan.workflowId)
  const land = landQuery.data

  const producerName = (id?: string) =>
    id ? (producers.find((p) => p.id === id)?.fullName ?? id.slice(0, 8)) : '—'

  const officerName = (id?: string) =>
    id ? (officers.find((o) => o.id === id)?.fullName ?? id.slice(0, 8)) : 'Atanmamış'

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
      const lat = landForm.latitude.trim() ? Number(landForm.latitude) : null
      const lng = landForm.longitude.trim() ? Number(landForm.longitude) : null
      return api(
        `/api/lands/${landId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: landForm.name.trim(),
            parcelNumber: landForm.parcelNumber.trim(),
            neighborhood: landForm.neighborhood.trim() || null,
            sizeInDecares: Number(landForm.sizeInDecares),
            latitude: lat != null && !Number.isNaN(lat) ? lat : null,
            longitude: lng != null && !Number.isNaN(lng) ? lng : null,
            soilType: landForm.soilType.trim() || null,
            soilNotes: landForm.soilNotes.trim() || null,
            cadastralBlock: landForm.cadastralBlock.trim() || null,
          }),
        },
        token,
      )
    },
    onSuccess: async () => {
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
      parcelNumber: landData.parcelNumber ?? '',
      neighborhood: landData.neighborhood ?? '',
      sizeInDecares: landData.sizeInDecares != null ? String(landData.sizeInDecares) : '',
      soilType: landData.soilType ?? '',
      soilNotes: landData.soilNotes ?? '',
      cadastralBlock: landData.cadastralBlock ?? '',
      latitude: landData.latitude != null ? String(landData.latitude) : '',
      longitude: landData.longitude != null ? String(landData.longitude) : '',
    })
  }, [landQuery.data])

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.replace('#', '')
    if (!id) return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, landQuery.data, landTasksQuery.data, conversationsQuery.data])

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

  function onAssign(e: FormEvent) {
    e.preventDefault()
    const producerId = assignForm.producerId || land?.producerId
    const officerUserId = assignForm.officerUserId || land?.assignedOfficerUserId
    if (!producerId && !officerUserId) return
    saveAssignments.mutate()
  }

  function onSaveLand(e: FormEvent) {
    e.preventDefault()
    if (!landForm.name.trim() || !landForm.parcelNumber.trim() || !landForm.sizeInDecares.trim()) {
      return
    }
    saveLand.mutate()
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
        <Link to="/lands" className="ghost-btn" style={{ marginBottom: 12, display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Arazilere dön
        </Link>
        <p className="error empty">
          {(landQuery.error as Error)?.message ?? 'Arazi bulunamadı.'}
        </p>
      </section>
    )
  }

  const canEditOps = admin || officer

  function taskOriginLabel(task: TaskItem) {
    return task.videoUrl || task.imageUrl ? 'Şablon adımı' : 'Manuel görev'
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <Link to="/lands" className="ghost-btn land-back-link">
            <ArrowLeft size={16} /> Araziler
          </Link>
          <h1>{land.name}</h1>
          <div className="land-meta">
            <p className="land-meta-primary">
              <span>Parsel {land.parcelNumber}</span>
              {land.neighborhood ? <span>{land.neighborhood}</span> : null}
              {land.sizeInDecares != null ? <span>{land.sizeInDecares} da</span> : null}
              {land.soilType ? <span>{land.soilType}</span> : null}
              {land.latitude != null && land.longitude != null ? (
                <span>
                  {land.latitude.toFixed(4)}, {land.longitude.toFixed(4)}
                </span>
              ) : (
                <span>Koordinat yok</span>
              )}
            </p>
            <p className="land-meta-secondary">
              {activeProduction ? (
                <span>
                  İş akışı: {activeProduction.workflowName} ({activeProduction.currentStepOrder}/
                  {activeProduction.stepCount || '—'})
                </span>
              ) : null}
              <span>Üretici: {producerName(land.producerId)}</span>
              <span>Uzman: {officerName(land.assignedOfficerUserId)}</span>
              {activeTasks.length > 0 ? <span>{activeTasks.length} açık görev</span> : null}
              {awaitingCount > 0 ? <span>{awaitingCount} onay bekliyor</span> : null}
              {(land.alertCount ?? 0) > 0 ? (
                <span className="land-meta-alert">{land.alertCount} uyarı</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="row-actions">
          {canEditOps && (
            <a href="#arazi-bilgileri" className="ghost-btn">
              <PencilLine size={16} /> Bilgileri düzenle
            </a>
          )}
          {canEditOps && (
            <a href="#uretim" className="primary-btn">
              <Sprout size={16} /> İş akışı uygula
            </a>
          )}
          <a href="#gorevler" className="ghost-btn">
            <ClipboardList size={16} /> Görevler
            {awaitingCount > 0 ? ` (${awaitingCount})` : ''}
          </a>
          <Link to={`/inspections?landId=${land.id}`} className="ghost-btn">
            <ShieldCheck size={16} /> Denetimler
          </Link>
        </div>
      </div>

      <div className="panel" id="arazi-bilgileri">
        <div className="land-section-head">
          <p className="panel-title">Arazi bilgileri</p>
        </div>
        <dl className="detail-grid">
          <div>
            <dt>Ad</dt>
            <dd>{land.name}</dd>
          </div>
          <div>
            <dt>Parsel</dt>
            <dd>{land.parcelNumber}</dd>
          </div>
          <div>
            <dt>Mahalle</dt>
            <dd>{land.neighborhood || '—'}</dd>
          </div>
          <div>
            <dt>Alan</dt>
            <dd>{land.sizeInDecares} da</dd>
          </div>
          <div>
            <dt>Toprak tipi</dt>
            <dd>{land.soilType || '—'}</dd>
          </div>
          <div>
            <dt>Koordinat</dt>
            <dd>
              {land.latitude != null && land.longitude != null
                ? `${land.latitude.toFixed(4)}, ${land.longitude.toFixed(4)}`
                : '—'}
            </dd>
          </div>
        </dl>
        {canEditOps && (
          <div className="land-inline-section">
            <button
              type="button"
              className="land-disclosure-btn"
              onClick={() => setShowLandEdit((v) => !v)}
              aria-expanded={showLandEdit}
            >
              <span>{showLandEdit ? 'Arazi düzenlemeyi gizle' : 'Arazi bilgilerini düzenle'}</span>
              {showLandEdit ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showLandEdit && (
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
                  Parsel no
                  <input
                    value={landForm.parcelNumber}
                    onChange={(e) => setLandForm({ ...landForm, parcelNumber: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Mahalle
                  <input
                    value={landForm.neighborhood}
                    onChange={(e) => setLandForm({ ...landForm, neighborhood: e.target.value })}
                  />
                </label>
                <label>
                  Alan (dekar)
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={landForm.sizeInDecares}
                    onChange={(e) => setLandForm({ ...landForm, sizeInDecares: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Ada / kadastro bloğu
                  <input
                    value={landForm.cadastralBlock}
                    onChange={(e) => setLandForm({ ...landForm, cadastralBlock: e.target.value })}
                  />
                </label>
                <label>
                  Toprak tipi
                  <input
                    value={landForm.soilType}
                    onChange={(e) => setLandForm({ ...landForm, soilType: e.target.value })}
                  />
                </label>
                <label>
                  Enlem
                  <input
                    type="number"
                    step="any"
                    value={landForm.latitude}
                    onChange={(e) => setLandForm({ ...landForm, latitude: e.target.value })}
                  />
                </label>
                <label>
                  Boylam
                  <input
                    type="number"
                    step="any"
                    value={landForm.longitude}
                    onChange={(e) => setLandForm({ ...landForm, longitude: e.target.value })}
                  />
                </label>
                <label className="full-span">
                  Toprak notları
                  <textarea
                    value={landForm.soilNotes}
                    onChange={(e) => setLandForm({ ...landForm, soilNotes: e.target.value })}
                    rows={2}
                  />
                </label>
                {saveLand.error && <p className="error">{(saveLand.error as Error).message}</p>}
                {saveLand.isSuccess && <p className="success-inline">Arazi bilgileri kaydedildi.</p>}
                <div className="row-actions full-span">
                  <button className="primary-btn" type="submit" disabled={saveLand.isPending}>
                    {saveLand.isPending ? 'Kaydediliyor…' : 'Bilgileri kaydet'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        {(admin || officer) && (
          <div className="land-inline-section">
            <div className="land-inline-head">
              <strong>Atamalar</strong>
            </div>
            {admin ? (
              <form className="form-grid two-col" onSubmit={onAssign}>
                <label>
                  Üretici
                  <select
                    value={assignForm.producerId}
                    onChange={(e) => setAssignForm({ ...assignForm, producerId: e.target.value })}
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
                    onChange={(e) => setAssignForm({ ...assignForm, officerUserId: e.target.value })}
                  >
                    <option value="">Seçin</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.fullName} ({o.email})
                      </option>
                    ))}
                  </select>
                </label>
                {saveAssignments.error && (
                  <p className="error">{(saveAssignments.error as Error).message}</p>
                )}
                {saveAssignments.isSuccess && (
                  <p className="success-inline">Atamalar kaydedildi.</p>
                )}
                <div className="row-actions full-span">
                  <button
                    className="primary-btn"
                    type="submit"
                    disabled={saveAssignments.isPending}
                  >
                    {saveAssignments.isPending ? 'Kaydediliyor…' : 'Atamaları kaydet'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="detail-grid">
                <div>
                  <dt>Üretici</dt>
                  <dd>{producerName(land.producerId)}</dd>
                </div>
                <div>
                  <dt>Tarım Uzmanı</dt>
                  <dd>{officerName(land.assignedOfficerUserId)}</dd>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="land-inline-section">
          <div className="land-inline-head">
            <strong>Denetimler</strong>
            <Link to={`/inspections?landId=${land.id}`} className="ghost-btn">
              <ShieldCheck size={16} />
              {admin ? 'Bu arazi için denetim ekle' : 'Denetimleri aç'}
            </Link>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="panel land-alerts-panel">
          <div className="land-alerts-head">
            <p className="panel-title land-alerts-title">
              <AlertTriangle size={16} aria-hidden />
              Uyarılar
              <span className="land-section-count">{alerts.length}</span>
            </p>
            <p className="land-alerts-intro">
              Geciken veya eksik görev adımları.{' '}
              <Link to="/notifications">Bildirimler</Link> sayfasında da listelenir.
            </p>
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

      {canEditOps && (
        <div className="panel land-plan-panel" id="uretim">
          <div className="land-inline-head land-inline-head-spaced">
            <div>
              <p className="panel-title">İş akışı uygula</p>
              <p className="muted-copy">
                Burada sadece seçip başlatın. Şablonu değiştirmek için <Link to="/workflows">İş akışları</Link>{' '}
                sayfasını kullanın.
              </p>
            </div>
            <Link to="/workflows" className="ghost-btn">
              Şablonları düzenle
            </Link>
          </div>

          <form className="form-grid" onSubmit={onStart}>
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
                      const prev =
                        i > 0 ? (arr[i - 1].dueDaysFromStart ?? 0) : null
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
                  <p className="muted-copy">Devamı ve düzenleme için İş akışları sayfasını açın.</p>
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
        </div>
      )}

      <div className="panel">
        <div className="land-section-head">
          <p className="panel-title">Uygulanan iş akışları</p>
        </div>
        {productionsQuery.isLoading ? (
          <p className="empty">Yükleniyor…</p>
        ) : productions.length === 0 ? (
          <p className="empty">Henüz üretim yok. Yukarıdan bu dönem için planlayın.</p>
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

      <div className="panel land-tasks-panel" id="gorevler">
        <div className="land-section-head land-section-head-actions">
          <p className="panel-title with-icon">
            <ClipboardList size={16} aria-hidden />
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
          <p className="empty">Bu arazide henüz görev yok.</p>
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

      <div className="panel" id="sohbet">
        <p className="panel-title with-icon">
          <MessageSquare size={16} aria-hidden />
          Üretici Sohbeti
          {unreadChatCount > 0 ? (
            <span className="badge" style={{ marginLeft: 8 }}>
              {unreadChatCount} yeni
            </span>
          ) : null}
        </p>
        <p className="muted-copy">
          Bu araziye ait üretici yazışmaları burada. Yönetici–uzman mesajları{' '}
          <Link to="/messages">Mesajlar</Link> panelindedir.
        </p>
        {conversationsQuery.isLoading ? (
          <p className="empty">Yükleniyor…</p>
        ) : landThreads.length === 0 ? (
          <p className="empty">
            Henüz sohbet yok. Üretici mobil uygulamadan «Uzmana sor» ile başlatır.
          </p>
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

      <div className="panel">
        <p className="panel-title with-icon">
          <NotebookPen size={16} aria-hidden />
          Uzman Notları
        </p>
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
          <p className="empty">Henüz not yok.</p>
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
