import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { api } from '../api/client'
import type { Producer, ProducerNote } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/roles'
import { ListSearch } from '../components/ListSearch'
import { matchesSearch } from '../utils/search'
import '../layout/layout.css'

const emptyForm = {
  firstName: '',
  lastName: '',
  nationalId: '',
  phone: '',
  email: '',
  address: '',
}

export function ProducersPage() {
  const { producerId } = useParams()
  if (producerId) return <ProducerDetailPage producerId={producerId} />
  return <ProducersListPage />
}

function ProducersListPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const admin = isAdmin(user?.roles)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const { data: items = [], error, isLoading } = useQuery({
    queryKey: ['producers'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token),
  })

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    return items.filter((item) =>
      matchesSearch(
        search,
        item.fullName,
        item.firstName,
        item.lastName,
        item.phone,
        item.email,
        item.nationalId,
        item.address,
      ),
    )
  }, [items, search])

  const create = useMutation({
    mutationFn: () =>
      api('/api/producers', { method: 'POST', body: JSON.stringify(form) }, token),
    onSuccess: async () => {
      setForm(emptyForm)
      setShowForm(false)
      await queryClient.invalidateQueries({ queryKey: ['producers'] })
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    create.mutate()
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Üreticiler</h1>
          <p>
            {admin
              ? 'Tüm üreticiler — iletişim bilgileri ve detay notları.'
              : 'Atandığınız arazilere bağlı üreticiler.'}
          </p>
        </div>
        {admin && (
          <button type="button" className="primary-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Formu kapat' : 'Yeni üretici'}
          </button>
        )}
      </div>

      <div className="panel">
        {showForm && admin && (
          <form className="form-grid two-col" onSubmit={onSubmit}>
            <label>
              Ad
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </label>
            <label>
              Soyad
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </label>
            <label>
              T.C. Kimlik No
              <input
                value={form.nationalId}
                onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                required
                maxLength={11}
              />
            </label>
            <label>
              Telefon
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </label>
            <label>
              E-posta
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Adres
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <div style={{ gridColumn: '1 / -1' }}>
              <button className="primary-btn" type="submit" disabled={create.isPending}>
                {create.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}

        {(error || create.error) && (
          <p className="error empty">{((create.error ?? error) as Error).message}</p>
        )}

        {isLoading ? (
          <p className="empty">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <p className="empty">Henüz üretici kaydı yok.</p>
        ) : (
          <>
            <div className="list-search-wrap">
              <ListSearch
                value={search}
                onChange={setSearch}
                placeholder="Ad, telefon, e-posta veya T.C. kimlik ara…"
                resultCount={filteredItems.length}
                totalCount={items.length}
              />
            </div>
            {filteredItems.length === 0 ? (
              <p className="list-search-empty">Aramanızla eşleşen üretici bulunamadı.</p>
            ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ad soyad</th>
                <th>Telefon</th>
                <th>E-posta</th>
                <th>T.C. Kimlik</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="table-row-clickable"
                  onClick={() => navigate(`/producers/${item.id}`)}
                >
                  <td>
                    <Link to={`/producers/${item.id}`} onClick={(e) => e.stopPropagation()}>
                      {item.fullName}
                    </Link>
                  </td>
                  <td>{item.phone || '—'}</td>
                  <td>{item.email ?? '—'}</td>
                  <td>{item.nationalId}</td>
                  <td>
                    <span className="badge">{item.isActive ? 'Aktif' : 'Pasif'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function ProducerDetailPage({ producerId }: { producerId: string }) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [noteBody, setNoteBody] = useState('')

  const producerQuery = useQuery({
    queryKey: ['producer', producerId],
    queryFn: () => api<Producer>(`/api/producers/${producerId}`, {}, token),
    enabled: Boolean(token && producerId),
  })

  const notesQuery = useQuery({
    queryKey: ['producer-notes', producerId],
    queryFn: () => api<ProducerNote[]>(`/api/producers/${producerId}/notes`, {}, token),
    enabled: Boolean(token && producerId),
  })

  const addNote = useMutation({
    mutationFn: () =>
      api(
        `/api/producers/${producerId}/notes`,
        { method: 'POST', body: JSON.stringify({ body: noteBody }) },
        token,
      ),
    onSuccess: async () => {
      setNoteBody('')
      await queryClient.invalidateQueries({ queryKey: ['producer-notes', producerId] })
    },
  })

  const producer = producerQuery.data
  const notes = notesQuery.data ?? []

  return (
    <section>
      <div className="page-header">
        <div>
          <Link to="/producers" className="text-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft className="size-3.5" /> Üreticiler
          </Link>
          <h1 style={{ marginTop: 8 }}>{producer?.fullName ?? 'Üretici detayı'}</h1>
          <p>İletişim bilgileri ve personel notları.</p>
        </div>
      </div>

      {producerQuery.error && <p className="error">{(producerQuery.error as Error).message}</p>}
      {producerQuery.isLoading && <p className="empty">Yükleniyor…</p>}

      {producer && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p className="panel-title">İletişim</p>
          <dl className="detail-grid">
            <div>
              <dt>Telefon</dt>
              <dd>
                <a href={`tel:${producer.phone}`}>{producer.phone || '—'}</a>
              </dd>
            </div>
            <div>
              <dt>E-posta</dt>
              <dd>
                {producer.email ? (
                  <a href={`mailto:${producer.email}`}>{producer.email}</a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>T.C. Kimlik</dt>
              <dd>{producer.nationalId}</dd>
            </div>
            <div>
              <dt>Adres</dt>
              <dd>{producer.address ?? '—'}</dd>
            </div>
            <div>
              <dt>Durum</dt>
              <dd>
                <span className="badge">{producer.isActive ? 'Aktif' : 'Pasif'}</span>
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="panel">
        <p className="panel-title">Notlar</p>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            if (!noteBody.trim()) return
            addNote.mutate()
          }}
          style={{ marginBottom: 16 }}
        >
          <label>
            Yeni not
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={3}
              placeholder="Görüşme, hatırlatma, saha notu…"
              required
            />
          </label>
          <div className="row-actions">
            <button className="primary-btn" type="submit" disabled={addNote.isPending}>
              {addNote.isPending ? 'Kaydediliyor…' : 'Not ekle'}
            </button>
          </div>
        </form>
        {addNote.error && <p className="error">{(addNote.error as Error).message}</p>}
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
    </section>
  )
}
