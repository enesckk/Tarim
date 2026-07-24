import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, MessageSquare, NotebookPen, RotateCcw, ShieldCheck, Sprout, XCircle } from 'lucide-react'
import { api, API_BASE } from '../api/client'
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
import type { TaskPhoto } from '../api/types'
import { PRODUCTION_WORKFLOW_STATUS, TASK_STATUS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin, isOfficer } from '../auth/roles'
import { Lightbox, type LightboxImage } from '../components/Lightbox'
import '../layout/layout.css'

function taskPhotoSrc(p: TaskPhoto) {
  const key = p.storageKey
  if (key.startsWith('http')) return key
  return `${API_BASE}/${key.replace(/^\//, '')}`
}

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
  const [cropFilter, setCropFilter] = useState('')
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
  const [coordsForm, setCoordsForm] = useState({ latitude: '', longitude: '' })
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    requiresPhoto: true,
  })

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

  const cropOptions = useMemo(() => {
    const set = new Set<string>()
    for (const w of workflows) {
      if (w.cropType?.trim()) set.add(w.cropType.trim())
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [workflows])

  const filteredWorkflows = useMemo(() => {
    const q = cropFilter.trim().toLocaleLowerCase('tr')
    if (!q) return workflows
    return workflows.filter(
      (w) =>
        (w.cropType ?? '').toLocaleLowerCase('tr').includes(q) ||
        w.name.toLocaleLowerCase('tr').includes(q),
    )
  }, [workflows, cropFilter])

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

  const saveCoords = useMutation({
    mutationFn: () => {
      const landData = landQuery.data
      if (!landData) throw new Error('Arazi yok')
      const lat = coordsForm.latitude.trim() ? Number(coordsForm.latitude) : null
      const lng = coordsForm.longitude.trim() ? Number(coordsForm.longitude) : null
      return api(
        `/api/lands/${landId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: landData.name,
            sizeInDecares: landData.sizeInDecares,
            latitude: lat != null && !Number.isNaN(lat) ? lat : null,
            longitude: lng != null && !Number.isNaN(lng) ? lng : null,
            soilType: landData.soilType ?? null,
            soilNotes: landData.soilNotes ?? null,
          }),
        },
        token,
      )
    },
    onSuccess: async () => {
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
      return api(
        `/api/lands/${landId}/tasks`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: taskForm.title.trim(),
            description: taskForm.description.trim() || null,
            dueDate,
            requiresPhoto: taskForm.requiresPhoto,
          }),
        },
        token,
      )
    },
    onSuccess: async () => {
      setTaskForm({ title: '', description: '', dueDate: '', requiresPhoto: true })
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
    setCoordsForm({
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

  function onSaveCoords(e: FormEvent) {
    e.preventDefault()
    saveCoords.mutate()
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
              <span>Üretici: {producerName(land.producerId)}</span>
              <span>Uzman: {officerName(land.assignedOfficerUserId)}</span>
              {(land.alertCount ?? 0) > 0 ? (
                <span className="land-meta-alert">{land.alertCount} uyarı</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="row-actions">
          {canEditOps && (
            <a href="#uretim" className="primary-btn">
              <Sprout size={16} /> İş Akışı / Üretim Ekle
            </a>
          )}
          <a href="#gorevler" className="ghost-btn">
            <ClipboardList size={16} /> Görevler
            {awaitingCount > 0 ? ` (${awaitingCount})` : ''}
          </a>
          <a href="#sohbet" className="ghost-btn">
            <MessageSquare size={16} /> Üretici sohbeti
            {unreadChatCount > 0 ? ` (${unreadChatCount})` : ''}
          </a>
          <Link to={`/inspections?landId=${land.id}`} className="ghost-btn">
            <ShieldCheck size={16} /> Denetimler
          </Link>
          <Link to="/notifications" className="ghost-btn">
            Bildirimler
          </Link>
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

      <div className="panel land-tasks-panel" id="gorevler">
        <div className="land-section-head">
          <p className="panel-title with-icon">
            <ClipboardList size={16} aria-hidden />
            Arazi görevleri
            {awaitingCount > 0 ? (
              <span className="badge badge-warn">{awaitingCount} onay bekliyor</span>
            ) : null}
          </p>
          <p className="muted-copy">
            Bu arazideki üretici görevlerini görün, yeni görev gönderin ve onay bekleyenleri
            buradan onaylayın, revize edin veya reddedin.
          </p>
        </div>

        {canEditOps && (
          <form
            className="land-task-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!taskForm.title.trim()) return
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
                  placeholder="Örn. Sulama kontrolü"
                  required
                />
              </label>
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
                <label className={`land-task-toggle${taskForm.requiresPhoto ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={taskForm.requiresPhoto}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, requiresPhoto: e.target.checked })
                    }
                  />
                  <span className="land-task-toggle-copy">
                    <strong>Fotoğraf zorunlu</strong>
                    <span>Tamamlarken kanıt fotoğrafı istenir</span>
                  </span>
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
                          {t.description ? (
                            <span className="table-cell-sub">{t.description}</span>
                          ) : null}
                        </div>
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
                                  src: taskPhotoSrc(p),
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

      {(admin || officer) && (
        <div className="panel">
          <p className="panel-title">Atamalar</p>
          <p className="muted-copy">
            {admin
              ? 'Bu araziye bir üretici ve bir Tarım Uzmanı atayın. Uzman yalnızca atandığı arazileri görür.'
              : 'Üretici ve uzman atamaları salt okunur. Değişiklik için yöneticiye başvurun.'}
          </p>
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
              <div className="row-actions" style={{ gridColumn: '1 / -1' }}>
                <button className="primary-btn" type="submit" disabled={saveAssignments.isPending}>
                  {saveAssignments.isPending ? 'Kaydediliyor…' : 'Atamaları kaydet'}
                </button>
              </div>
            </form>
          ) : (
            <div className="form-grid two-col">
              <p>
                <strong>Üretici:</strong> {producerName(land.producerId)}
              </p>
              <p>
                <strong>Tarım Uzmanı:</strong> {officerName(land.assignedOfficerUserId)}
              </p>
            </div>
          )}
        </div>
      )}

      {canEditOps && (
        <div className="panel">
          <p className="panel-title">Harita Koordinatları</p>
          <p className="muted-copy">
            Operasyon Merkezi haritasında görünmesi için enlem ve boylam girin (WGS84).
          </p>
          <form className="form-grid two-col" onSubmit={onSaveCoords}>
            <label>
              Enlem
              <input
                type="number"
                step="any"
                value={coordsForm.latitude}
                onChange={(e) => setCoordsForm({ ...coordsForm, latitude: e.target.value })}
                placeholder="örn. 37.0782"
              />
            </label>
            <label>
              Boylam
              <input
                type="number"
                step="any"
                value={coordsForm.longitude}
                onChange={(e) => setCoordsForm({ ...coordsForm, longitude: e.target.value })}
                placeholder="örn. 37.3821"
              />
            </label>
            {saveCoords.error && (
              <p className="error">{(saveCoords.error as Error).message}</p>
            )}
            {saveCoords.isSuccess && (
              <p className="success-inline">Koordinatlar kaydedildi.</p>
            )}
            <div className="row-actions" style={{ gridColumn: '1 / -1' }}>
              <button className="primary-btn" type="submit" disabled={saveCoords.isPending}>
                {saveCoords.isPending ? 'Kaydediliyor…' : 'Koordinatları kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {canEditOps && (
        <div className="panel land-plan-panel" id="uretim">
          <div className="workflow-builder-header">
            <div>
              <p className="panel-title">İş Akışı / Üretim Planı</p>
              <p className="muted-copy">
                Ürün ve şablonu seçerek bu dönem için üretimi başlatın. Görevler otomatik
                oluşur.
              </p>
            </div>
            <Sprout size={22} className="land-plan-icon" aria-hidden />
          </div>

          <form className="form-grid" onSubmit={onStart}>
            <div className="workflow-meta-grid">
              <label>
                Ürün (filtre)
                <input
                  list="crop-options"
                  value={cropFilter}
                  onChange={(e) => {
                    setCropFilter(e.target.value)
                    setPlan((p) => ({ ...p, workflowId: '' }))
                  }}
                  placeholder="Örn. Domates"
                />
                <datalist id="crop-options">
                  {cropOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
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
              İş Akışı Şablonu
              <select
                value={plan.workflowId}
                onChange={(e) => setPlan({ ...plan, workflowId: e.target.value })}
                required
              >
                <option value="">Seçin</option>
                {filteredWorkflows.map((w) => (
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
                  {' · '}
                  takvim (başlangıçtan gün)
                </strong>
                <ol>
                  {[...selectedWorkflow.steps]
                    .sort((a, b) => a.order - b.order)
                    .slice(0, 8)
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
                {startProduction.isPending ? 'Başlatılıyor…' : 'Üretimi başlat'}
              </button>
              {admin ? (
                <Link to="/workflows" className="ghost-btn">
                  Şablonları yönet
                </Link>
              ) : null}
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <p className="panel-title">Bu Arazideki Üretimler</p>
        <p className="muted-copy">
          Bu araziye bağlı aktif ve geçmiş üretim planları.
        </p>
        {productionsQuery.isLoading ? (
          <p className="empty">Yükleniyor…</p>
        ) : productions.length === 0 ? (
          <p className="empty">Henüz üretim yok. Yukarıdan bu dönem için planlayın.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>İş akışı</th>
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
