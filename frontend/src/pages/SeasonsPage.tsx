import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Season } from '../api/types'
import { SEASON_STATUS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/roles'
import '../layout/layout.css'

export function SeasonsPage() {
  const { token, user } = useAuth()
  const admin = isAdmin(user?.roles)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    year: new Date().getFullYear(),
    startDate: new Date().toISOString().slice(0, 10),
    description: '',
  })

  const { data: items = [], error, isLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => api<Season[]>('/api/seasons', {}, token),
    enabled: Boolean(token && admin),
  })

  const create = useMutation({
    mutationFn: () =>
      api('/api/seasons', { method: 'POST', body: JSON.stringify(form) }, token),
    onSuccess: async () => {
      setForm({ ...form, name: '', description: '' })
      setShowForm(false)
      await queryClient.invalidateQueries({ queryKey: ['seasons'] })
    },
  })

  const start = useMutation({
    mutationFn: (id: string) =>
      api(`/api/seasons/${id}/start`, { method: 'POST' }, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['seasons'] })
    },
  })

  if (!admin) return <Navigate to="/" replace />

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    create.mutate()
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Sezonlar</h1>
          <p>Üretim sezonları — yalnızca yönetici oluşturur ve başlatır.</p>
        </div>
        <button type="button" className="primary-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Formu kapat' : 'Yeni sezon'}
        </button>
      </div>

      <div className="panel">
        {showForm && (
          <form className="form-grid two-col" onSubmit={onSubmit}>
            <label>
              Ad
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Yıl
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                required
              />
            </label>
            <label>
              Başlangıç
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </label>
            <label>
              Açıklama
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            {create.error && <p className="error">{(create.error as Error).message}</p>}
            <div className="row-actions" style={{ gridColumn: '1 / -1' }}>
              <button className="primary-btn" type="submit" disabled={create.isPending}>
                {create.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}

        {error && <p className="error empty">{(error as Error).message}</p>}
        {isLoading ? (
          <p className="empty">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <p className="empty">Henüz sezon yok.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Yıl</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.year}</td>
                  <td>{SEASON_STATUS[item.status] ?? item.status}</td>
                  <td>
                    {item.status === 0 ? (
                      <button
                        type="button"
                        className="ghost-btn"
                        disabled={start.isPending}
                        onClick={() => start.mutate(item.id)}
                      >
                        Başlat
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
