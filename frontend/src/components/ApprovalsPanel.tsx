import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  ImageOff,
  Info,
  RotateCcw,
  Send,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { api } from '../api/client'
import { mediaUrl } from '../api/media'
import type { TaskItem, TaskPhoto } from '../api/types'
import { formatEvidenceEntries, themeLabel } from '../api/taskThemes'
import { useAuth } from '../auth/AuthContext'
import { Lightbox, type LightboxImage } from './Lightbox'
import '../layout/layout.css'

type PendingTask = TaskItem & {
  landName?: string
  photos?: TaskPhoto[]
  revisionReason?: string | null
  plannedEvidenceJson?: string | null
  hasVarianceWarning?: boolean
  varianceWarning?: string | null
}

function formatDate(value?: string) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Onay kuyruğu ekranı. */
export function ApprovalsPanel({ embedded = false }: { embedded?: boolean }) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(
    null,
  )

  const query = useQuery({
    queryKey: ['pending-approval'],
    queryFn: () => api<PendingTask[]>('/api/tasks/pending-approval', {}, token),
    enabled: Boolean(token),
    refetchInterval: 30_000,
  })

  const items = useMemo(
    () => (query.data ?? []).filter((t) => t.status === 5),
    [query.data],
  )

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pending-approval'] }),
      queryClient.invalidateQueries({ queryKey: ['operations-center'] }),
      queryClient.invalidateQueries({ queryKey: ['land-tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ])
  }

  const approve = useMutation({
    mutationFn: (taskId: string) =>
      api(`/api/tasks/${taskId}/approve`, { method: 'POST' }, token),
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const reject = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      api(
        `/api/tasks/${taskId}/reject`,
        { method: 'POST', body: JSON.stringify({ reason }) },
        token,
      ),
    onSuccess: async () => {
      setRejectFor(null)
      setReason('')
      setActionError(null)
      await invalidate()
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const cancel = useMutation({
    mutationFn: (taskId: string) =>
      api(`/api/tasks/${taskId}/cancel`, { method: 'POST' }, token),
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const openLightbox = (photos: TaskPhoto[], index: number) => {
    setLightbox({
      images: photos.map((p) => ({
        src: mediaUrl(p.storageKey, token),
        alt: p.fileName,
        caption: p.fileName,
      })),
      index,
    })
  }

  return (
    <section
      className={embedded ? 'ops-panel ops-approvals-panel' : 'ops-page approvals-page'}
      id={embedded ? 'onaylar' : undefined}
    >
      {embedded ? (
        <div className="ops-panel-head">
          <div className="ops-panel-head-main">
            <h3>Onaylar</h3>
            {items.length > 0 ? (
              <span className="ops-alert-count">{items.length}</span>
            ) : null}
          </div>
        </div>
      ) : (
        <header className="page-header approvals-header">
          <div>
            <h1>Onaylar</h1>
            <p>
              {items.length > 0
                ? `${items.length} görev seni bekliyor — kanıtı kontrol et, onayla, revize et veya reddet.`
                : 'Şu an bekleyen onay yok.'}
            </p>
          </div>
          {items.length > 0 ? (
            <span className="approvals-count-pill">
              <ClipboardCheck size={16} aria-hidden />
              {items.length} bekliyor
            </span>
          ) : null}
        </header>
      )}

      {embedded && items.length > 0 ? (
        <p className="muted" style={{ margin: '0 0 12px' }}>
          Kanıtı kontrol et, onayla, revize et veya reddet.
        </p>
      ) : null}

      {actionError ? <p className="error approvals-error">{actionError}</p> : null}
      {query.isLoading ? <p className="empty">Yükleniyor…</p> : null}
      {query.error ? <p className="error">{(query.error as Error).message}</p> : null}

      {items.length === 0 && !query.isLoading ? (
        <div className="ops-empty approvals-empty">
          <CheckCircle2 className="ops-empty-icon" aria-hidden />
          <p>Onay bekleyen görev yok.</p>
          <span>Üretici kanıt gönderdiğinde görevler burada listelenir.</span>
        </div>
      ) : (
        <ul className="approvals-list">
          {items.map((task) => {
            const photos = task.photos ?? []
            const submitted = formatDate(task.completedAtUtc)
            const due = formatDate(task.dueDate)
            const isRejecting = rejectFor === task.id
            const busy =
              (approve.isPending && approve.variables === task.id) ||
              (cancel.isPending && cancel.variables === task.id) ||
              (reject.isPending && reject.variables?.taskId === task.id)
            const meta = [task.landName].filter(Boolean).join(' · ')

            return (
              <li key={task.id} className={`approvals-card${busy ? ' is-busy' : ''}`}>
                <div className="approvals-card-head">
                  <div className="approvals-card-title">
                    <h3>{task.title}</h3>
                    {meta ? <p className="approvals-card-meta">{meta}</p> : null}
                    {themeLabel(task.theme) ? (
                      <p className="approvals-card-theme">{themeLabel(task.theme)}</p>
                    ) : null}
                  </div>
                  <span className="badge badge-warn approvals-status">Onay bekliyor</span>
                </div>

                <div className="approvals-card-dates">
                  {submitted ? (
                    <span>
                      <Send size={13} aria-hidden />
                      Gönderildi: {submitted}
                    </span>
                  ) : null}
                  {due ? (
                    <span>
                      <CalendarClock size={13} aria-hidden />
                      Vade: {due}
                    </span>
                  ) : null}
                </div>

                {task.description ? (
                  <p className="approvals-card-note">
                    <Info size={14} aria-hidden />
                    <span>{task.description}</span>
                  </p>
                ) : null}

                {task.hasVarianceWarning ? (
                  <p className="approvals-card-variance" role="status">
                    <TriangleAlert size={14} aria-hidden />
                    <span>
                      <strong>Sapma uyarısı:</strong>{' '}
                      {task.varianceWarning ||
                        'Planlanan ile gerçekleşen değerler arasında belirgin fark var (~%15+).'}
                    </span>
                  </p>
                ) : null}

                {(() => {
                  const plannedRows = formatEvidenceEntries(
                    task.theme,
                    task.plannedEvidenceJson,
                    { planned: true },
                  )
                  const actualRows = formatEvidenceEntries(task.theme, task.evidenceJson)
                  if (plannedRows.length === 0 && actualRows.length === 0 && !task.completionNotes)
                    return null
                  return (
                    <div className="approvals-compare">
                      {plannedRows.length > 0 ? (
                        <div className="approvals-evidence approvals-evidence-planned">
                          <p className="approvals-evidence-title">Planlanan (hedef)</p>
                          <dl className="approvals-evidence-list">
                            {plannedRows.map((row) => (
                              <div key={`p-${row.label}`} className="approvals-evidence-row">
                                <dt>{row.label}</dt>
                                <dd>{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ) : null}
                      <div className="approvals-evidence approvals-evidence-actual">
                        <p className="approvals-evidence-title">Gerçekleşen (üretici)</p>
                        {actualRows.length > 0 ? (
                          <dl className="approvals-evidence-list">
                            {actualRows.map((row) => (
                              <div key={`a-${row.label}`} className="approvals-evidence-row">
                                <dt>{row.label}</dt>
                                <dd>{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : task.completionNotes ? (
                          <p className="approvals-evidence-notes">{task.completionNotes}</p>
                        ) : (
                          <p className="approvals-evidence-notes muted">Yapılandırılmış kanıt yok</p>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {task.revisionReason ? (
                  <p className="approvals-card-revision">
                    <RotateCcw size={14} aria-hidden />
                    <span>
                      <strong>Önceki revizyon notu:</strong> {task.revisionReason}
                    </span>
                  </p>
                ) : null}

                {photos.length > 0 ? (
                  <div className="approvals-thumbs">
                    {photos.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        className="approvals-thumb"
                        onClick={() => openLightbox(photos, i)}
                        aria-label={`Fotoğrafı büyüt (${i + 1}/${photos.length})`}
                      >
                        <img
                          src={mediaUrl(p.storageKey, token)}
                          alt={p.fileName || ''}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="approvals-no-photo">
                    <ImageOff size={14} aria-hidden />
                    Kanıt fotoğrafı yok
                  </p>
                )}

                {task.landId ? (
                  <Link to={`/lands/${task.landId}`} className="approvals-land-link">
                    <ExternalLink size={13} aria-hidden />
                    Araziyi aç
                  </Link>
                ) : null}

                {isRejecting ? (
                  <div className="approvals-revise-form">
                    <label className="approvals-revise-label" htmlFor={`reason-${task.id}`}>
                      Üreticiye düzeltme notu <em>(zorunlu)</em>
                    </label>
                    <textarea
                      id={`reason-${task.id}`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      autoFocus
                      placeholder="Neyin düzeltilmesi gerektiğini açıklayın…"
                    />
                    <div className="approvals-actions">
                      <button
                        type="button"
                        className="primary-btn"
                        disabled={!reason.trim() || busy}
                        onClick={() =>
                          reject.mutate({ taskId: task.id, reason: reason.trim() })
                        }
                      >
                        <RotateCcw size={16} aria-hidden />
                        {busy ? 'Gönderiliyor…' : 'Revizeye gönder'}
                      </button>
                      <button
                        type="button"
                        className="ghost-btn"
                        disabled={busy}
                        onClick={() => {
                          setRejectFor(null)
                          setReason('')
                        }}
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="approvals-actions">
                    <button
                      type="button"
                      className="primary-btn approvals-approve-btn"
                      disabled={busy}
                      onClick={() => approve.mutate(task.id)}
                    >
                      <CheckCircle2 size={16} aria-hidden />
                      {busy && approve.variables === task.id ? 'Onaylanıyor…' : 'Onayla'}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      disabled={busy}
                      onClick={() => {
                        setRejectFor(task.id)
                        setReason('')
                        setActionError(null)
                      }}
                    >
                      <RotateCcw size={16} aria-hidden />
                      Revize et
                    </button>
                    <button
                      type="button"
                      className="ghost-btn approvals-reject-btn"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            'Bu görevi kalıcı olarak reddetmek istediğinize emin misiniz?',
                          )
                        ) {
                          cancel.mutate(task.id)
                        }
                      }}
                    >
                      <XCircle size={16} aria-hidden />
                      Reddet
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
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
