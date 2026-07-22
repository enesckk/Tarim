import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { api, API_BASE } from '../api/client'
import type { TaskItem, TaskPhoto } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import '../layout/layout.css'

type PendingTask = TaskItem & {
  landName?: string
  photos?: TaskPhoto[]
  revisionReason?: string | null
}

function photoSrc(p: TaskPhoto) {
  const key = p.storageKey
  if (key.startsWith('http')) return key
  return `${API_BASE}/${key.replace(/^\//, '')}`
}

export function ApprovalsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

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

  const approve = useMutation({
    mutationFn: (taskId: string) =>
      api(`/api/tasks/${taskId}/approve`, { method: 'POST' }, token),
    onSuccess: async () => {
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey: ['pending-approval'] })
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
      await queryClient.invalidateQueries({ queryKey: ['pending-approval'] })
    },
    onError: (e: Error) => setActionError(e.message),
  })

  return (
    <section className="ops-page" style={{ maxWidth: 720 }}>
      <header className="page-header">
        <div>
          <h1>Onay kuyruğu</h1>
          <p>
            {items.length > 0
              ? `${items.length} görev seni bekliyor — kanıtı kontrol et, onayla veya düzeltme iste.`
              : 'Şu an bekleyen onay yok.'}
          </p>
        </div>
      </header>

      {actionError ? <p className="error">{actionError}</p> : null}
      {query.isLoading ? <p className="empty">Yükleniyor…</p> : null}
      {query.error ? <p className="error">{(query.error as Error).message}</p> : null}

      {items.length === 0 && !query.isLoading ? (
        <div className="ops-empty">
          <CheckCircle2 className="ops-empty-icon" aria-hidden />
          <p>Kuyruk boş. Üretici kanıt gönderince burada görünür.</p>
        </div>
      ) : (
        <ul className="ops-action-list">
          {items.map((task) => (
            <li key={task.id} className="panel" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong style={{ fontSize: '1.05rem' }}>{task.title}</strong>
                  <p className="muted" style={{ margin: '4px 0 0' }}>
                    {[task.landName, task.description].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {task.landId ? (
                  <Link to={`/lands/${task.landId}`} className="text-link">
                    Arazi
                  </Link>
                ) : null}
              </div>

              {(task.photos?.length ?? 0) > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {task.photos!.slice(0, 4).map((p) => (
                    <img
                      key={p.id}
                      src={photoSrc(p)}
                      alt=""
                      style={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ marginTop: 10 }}>
                  Kanıt fotoğrafı yok
                </p>
              )}

              {rejectFor === task.id ? (
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Üreticiye düzeltme notu (zorunlu)"
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={!reason.trim() || reject.isPending}
                      onClick={() =>
                        reject.mutate({ taskId: task.id, reason: reason.trim() })
                      }
                    >
                      <RotateCcw size={16} />
                      Düzeltme iste
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
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
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(task.id)}
                  >
                    <CheckCircle2 size={16} />
                    Onayla
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => setRejectFor(task.id)}
                  >
                    Düzeltme iste
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
