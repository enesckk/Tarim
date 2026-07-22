import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Inspection, Land, Producer, StaffUser } from '../api/types'
import { INSPECTION_RESULT, INSPECTION_STATUS } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin, isOfficer } from '../auth/roles'
import '../layout/layout.css'

export function InspectionsPage() {
  const { token, user } = useAuth()
  const admin = isAdmin(user?.roles)
  const officer = isOfficer(user?.roles) && !admin
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    landId: '',
    producerId: '',
    inspectorUserId: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    description: '',
  })
  const [completeId, setCompleteId] = useState<string | null>(null)
  const [completeForm, setCompleteForm] = useState({ result: '1', report: '' })

  const inspectionsQuery = useQuery({
    queryKey: ['inspections'],
    queryFn: () => api<Inspection[]>('/api/inspections', {}, token),
    enabled: Boolean(token),
  })

  const producersQuery = useQuery({
    queryKey: ['producers'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token),
  })

  const landsQuery = useQuery({
    queryKey: ['lands'],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token),
  })

  const officersQuery = useQuery({
    queryKey: ['officers', 'inspections'],
    queryFn: () => api<StaffUser[]>('/api/users/officers', {}, token),
    enabled: Boolean(token && admin),
  })

  /** Deep link from arazi merkezi: /inspections?landId=… */
  useEffect(() => {
    const landId = searchParams.get('landId')
    if (!landId || !admin) return
    const land = (landsQuery.data ?? []).find((l) => l.id === landId)
    setShowForm(true)
    setForm((prev) => ({
      ...prev,
      landId,
      producerId: land?.producerId ?? prev.producerId,
      inspectorUserId: land?.assignedOfficerUserId ?? prev.inspectorUserId,
    }))
  }, [searchParams, landsQuery.data, admin])

  const create = useMutation({
    mutationFn: () =>
      api(
        '/api/inspections',
        {
          method: 'POST',
          body: JSON.stringify({
            title: form.title,
            landId: form.landId,
            producerId: form.producerId,
            inspectorUserId: form.inspectorUserId || user?.userId,
            scheduledDate: form.scheduledDate,
            description: form.description || null,
            seasonId: null,
            productionWorkflowId: null,
          }),
        },
        token,
      ),
    onSuccess: async () => {
      setShowForm(false)
      setForm({
        title: '',
        landId: '',
        producerId: '',
        inspectorUserId: '',
        scheduledDate: new Date().toISOString().slice(0, 10),
        description: '',
      })
      await queryClient.invalidateQueries({ queryKey: ['inspections'] })
      await queryClient.invalidateQueries({ queryKey: ['operations-center'] })
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const complete = useMutation({
    mutationFn: () =>
      api(
        `/api/inspections/${completeId}/complete`,
        {
          method: 'POST',
          body: JSON.stringify({
            result: Number(completeForm.result),
            report: completeForm.report,
          }),
        },
        token,
      ),
    onSuccess: async () => {
      setCompleteId(null)
      setCompleteForm({ result: '1', report: '' })
      await queryClient.invalidateQueries({ queryKey: ['inspections'] })
      await queryClient.invalidateQueries({ queryKey: ['operations-center'] })
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    create.mutate()
  }

  function onComplete(event: FormEvent) {
    event.preventDefault()
    complete.mutate()
  }

  const producers = producersQuery.data ?? []
  const lands = landsQuery.data ?? []
  const officers = officersQuery.data ?? []

  const items = useMemo(() => {
    const all = inspectionsQuery.data ?? []
    if (!officer || !user?.userId) return all
    // Officer: assigned to them as inspector, or on their lands (API already scopes lands)
    return all.filter(
      (i) =>
        i.inspectorUserId === user.userId ||
        lands.some((l) => l.id === i.landId && l.assignedOfficerUserId === user.userId),
    )
  }, [inspectionsQuery.data, officer, user?.userId, lands])

  const landName = (id: string) => lands.find((l) => l.id === id)?.name ?? id.slice(0, 8)
  const officerName = (id: string) =>
    officers.find((o) => o.id === id)?.fullName ?? (id === user?.userId ? 'Siz' : 'Uzman')

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>{officer ? 'Denetimlerim' : 'Denetimler'}</h1>
          <p>
            {officer
              ? 'Size atanan saha denetimleri — planlananları tamamlayın.'
              : 'Tarım uzmanına denetim atayın; uzman Denetimlerim listesinde görür.'}
          </p>
        </div>
        {admin ? (
          <button type="button" className="primary-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Formu kapat' : 'Denetim ata'}
          </button>
        ) : null}
      </div>

      {create.error && <p className="error">{(create.error as Error).message}</p>}
      {complete.error && <p className="error">{(complete.error as Error).message}</p>}

      <div className="panel">
        {showForm && admin && (
          <form className="form-grid two-col" onSubmit={onSubmit}>
            <label>
              Başlık
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label>
              Tarih
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                required
              />
            </label>
            <label>
              Üretici
              <select
                value={form.producerId}
                onChange={(e) => setForm({ ...form, producerId: e.target.value })}
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
            <label>
              Arazi
              <select
                value={form.landId}
                onChange={(e) => {
                  const landId = e.target.value
                  const land = lands.find((l) => l.id === landId)
                  setForm({
                    ...form,
                    landId,
                    producerId: land?.producerId || form.producerId,
                    inspectorUserId: land?.assignedOfficerUserId || form.inspectorUserId,
                  })
                }}
                required
              >
                <option value="">Seçin</option>
                {lands.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Atanan uzman
              <select
                value={form.inspectorUserId}
                onChange={(e) => setForm({ ...form, inspectorUserId: e.target.value })}
                required
              >
                <option value="">Seçin</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.fullName} ({o.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="full-span">
              Açıklama
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className="full-span">
              <button type="submit" className="primary-btn" disabled={create.isPending}>
                {create.isPending ? 'Atanıyor…' : 'Uzmana ata'}
              </button>
            </div>
          </form>
        )}

        {completeId && (
          <form className="form-grid" onSubmit={onComplete}>
            <p className="panel-title">Denetimi tamamla</p>
            <label>
              Sonuç
              <select
                value={completeForm.result}
                onChange={(e) => setCompleteForm({ ...completeForm, result: e.target.value })}
              >
                {INSPECTION_RESULT.map((label, i) =>
                  i === 0 ? null : (
                    <option key={label} value={String(i)}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Rapor
              <textarea
                value={completeForm.report}
                onChange={(e) => setCompleteForm({ ...completeForm, report: e.target.value })}
                required
              />
            </label>
            <div className="row-actions">
              <button type="submit" className="primary-btn" disabled={complete.isPending}>
                Tamamla
              </button>
              <button type="button" className="ghost-btn" onClick={() => setCompleteId(null)}>
                Vazgeç
              </button>
            </div>
          </form>
        )}

        {inspectionsQuery.isLoading && <p className="empty">Yükleniyor…</p>}
        {inspectionsQuery.error && (
          <p className="error">{(inspectionsQuery.error as Error).message}</p>
        )}
        {!inspectionsQuery.isLoading && items.length === 0 && (
          <p className="empty">
            {officer
              ? 'Size atanmış denetim yok. Yönetici atayınca burada görünür.'
              : 'Henüz denetim yok.'}
          </p>
        )}
        {items.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Arazi</th>
                <th>Tarih</th>
                <th>Durum</th>
                {admin ? <th>Uzman</th> : null}
                <th>Sonuç</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-cell-stack">
                      <strong>{item.title}</strong>
                    </div>
                  </td>
                  <td>{landName(item.landId)}</td>
                  <td>{item.scheduledDate}</td>
                  <td>
                    <span className="badge">{INSPECTION_STATUS[item.status] ?? '—'}</span>
                  </td>
                  {admin ? <td>{officerName(item.inspectorUserId)}</td> : null}
                  <td>{INSPECTION_RESULT[item.result] ?? '—'}</td>
                  <td>
                    {item.status !== 2 && item.status !== 3 ? (
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => setCompleteId(item.id)}
                      >
                        Tamamla
                      </button>
                    ) : (
                      '—'
                    )}
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
