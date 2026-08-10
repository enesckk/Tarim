import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { mediaUrl } from '../api/media'
import type { Producer, TaskItem } from '../api/types'
import { TASK_STATUS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import '../layout/layout.css'

const AWAITING_APPROVAL = 5

export function TasksPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [producerId, setProducerId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const producersQuery = useQuery({
    queryKey: ['producers'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token),
  })

  const tasksQuery = useQuery({
    queryKey: ['tasks', producerId],
    queryFn: () => {
      const qs = producerId ? `?producerId=${producerId}` : ''
      return api<TaskItem[]>(`/api/tasks${qs}`, {}, token)
    },
    enabled: Boolean(token),
  })

  const approveMutation = useMutation({
    mutationFn: (taskId: string) =>
      api(`/api/tasks/${taskId}/approve`, { method: 'POST' }, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const items = useMemo(() => {
    const list = tasksQuery.data ?? []
    if (statusFilter === 'all') return list
    return list.filter((t) => String(t.status) === statusFilter)
  }, [tasksQuery.data, statusFilter])

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Görev listesi</h1>
          <p>
            Bu ekran yardımcı toplu listedir. Ana operasyon arazi detayında, ayrıntılı inceleme ise
            <Link to="/app/approvals"> Onaylar</Link> ekranında yürür.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="land-section-head">
          <p className="panel-title">Toplu görünüm</p>
          <p className="muted-copy">
            Burada tüm görevleri filtreleyebilirsin. Yeni görev göndermek veya üretim planı
            başlatmak için ilgili araziye gitmen daha doğrudur.
          </p>
        </div>
        <div className="row-actions tasks-page-shortcuts">
          <Link to="/app/lands" className="ghost-btn">
            Arazilerden yönet
          </Link>
          <Link to="/app/approvals" className="ghost-btn">
            Onay kuyruğunu aç
          </Link>
        </div>
        <div className="toolbar">
          <label className="field">
            Üretici
            <select value={producerId} onChange={(e) => setProducerId(e.target.value)}>
              <option value="">Tümü</option>
              {(producersQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Durum
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tümü</option>
              {TASK_STATUS.map((label, i) => (
                <option key={label} value={String(i)}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {tasksQuery.error && (
          <p className="error empty">{(tasksQuery.error as Error).message}</p>
        )}
        {approveMutation.error && (
          <p className="error empty">{(approveMutation.error as Error).message}</p>
        )}

        {tasksQuery.isLoading ? (
          <p className="empty">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <p className="empty">Bu filtrelere uygun görev bulunamadı.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Vade</th>
                <th>Durum</th>
                <th>Fotoğraf</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const count = item.photoCount ?? item.photos?.length ?? 0
                const first = item.photos?.[0]
                const awaiting = item.status === AWAITING_APPROVAL
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="table-cell-stack">
                        <strong>{item.title}</strong>
                        {item.description ? (
                          <span className="table-cell-sub">{item.description}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>{item.dueDate ?? '—'}</td>
                    <td>
                      <span className="badge">
                        {TASK_STATUS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td>
                      {count > 0 && first ? (
                        <a href={mediaUrl(first.storageKey, token)} target="_blank" rel="noreferrer">
                          Yüklendi ({count})
                        </a>
                      ) : item.requiresPhoto ? (
                        'Zorunlu — henüz yok'
                      ) : (
                        'Yok'
                      )}
                    </td>
                    <td>
                      {awaiting ? (
                        <button
                          type="button"
                          className="btn primary"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(item.id)}
                        >
                          Onayla
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
