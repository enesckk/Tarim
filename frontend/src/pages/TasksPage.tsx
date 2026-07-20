import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { API_BASE, api } from '../api/client'
import type { Producer, TaskItem } from '../api/types'
import { TASK_STATUS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import '../layout/layout.css'

function photoUrl(storageKey: string) {
  const path = storageKey.startsWith('/') ? storageKey : `/${storageKey}`
  return `${API_BASE}${path}`
}

export function TasksPage() {
  const { token } = useAuth()
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

  const items = useMemo(() => {
    const list = tasksQuery.data ?? []
    if (statusFilter === 'all') return list
    return list.filter((t) => String(t.status) === statusFilter)
  }, [tasksQuery.data, statusFilter])

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Görevler</h1>
          <p>
            Üreticilere atanan görevlerin operasyon görünümü — vadeler ve durumlar.
          </p>
        </div>
      </div>

      <div className="panel">
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
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const count = item.photoCount ?? item.photos?.length ?? 0
                const first = item.photos?.[0]
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      {item.description && (
                        <div style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td>{item.dueDate ?? '—'}</td>
                    <td>
                      <span className="badge">
                        {TASK_STATUS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td>
                      {count > 0 && first ? (
                        <a href={photoUrl(first.storageKey)} target="_blank" rel="noreferrer">
                          Yüklendi ({count})
                        </a>
                      ) : item.requiresPhoto ? (
                        'Zorunlu — henüz yok'
                      ) : (
                        'Yok'
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
