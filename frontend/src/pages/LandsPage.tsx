import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Land } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/roles'
import { ListSearch } from '../components/ListSearch'
import { matchesSearch } from '../utils/search'
import '../layout/layout.css'

const emptyForm = {
  name: '',
  parcelNumber: '',
  neighborhood: '',
  sizeInDecares: 1,
  soilType: '',
  soilNotes: '',
  cadastralBlock: '',
  latitude: '',
  longitude: '',
}

export function LandsPage() {
  const { token, user } = useAuth()
  const admin = isAdmin(user?.roles)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!admin || location.hash !== '#yeni') return
    setShowForm(true)
    const el = document.getElementById('yeni-arazi')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [admin, location.hash])

  const { data: items = [], error, isLoading } = useQuery({
    queryKey: ['lands'],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token),
  })

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    return items.filter((item) =>
      matchesSearch(
        search,
        item.name,
        item.parcelNumber,
        item.neighborhood,
        item.cadastralBlock,
        item.soilType,
        item.activeCropType,
        item.activeWorkflowName,
      ),
    )
  }, [items, search])

  const create = useMutation({
    mutationFn: () => {
      const lat = form.latitude.trim() ? Number(form.latitude) : null
      const lng = form.longitude.trim() ? Number(form.longitude) : null
      return api<string>(
        '/api/lands',
        {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            parcelNumber: form.parcelNumber.trim(),
            neighborhood: form.neighborhood.trim() || null,
            sizeInDecares: Number(form.sizeInDecares),
            soilType: form.soilType.trim() || null,
            soilNotes: form.soilNotes.trim() || null,
            cadastralBlock: form.cadastralBlock.trim() || null,
            latitude: lat != null && !Number.isNaN(lat) ? lat : null,
            longitude: lng != null && !Number.isNaN(lng) ? lng : null,
            city: null,
            district: null,
            producerId: null,
          }),
        },
        token,
      )
    },
    onSuccess: async (newId) => {
      setForm(emptyForm)
      setShowForm(false)
      await queryClient.invalidateQueries({ queryKey: ['lands'] })
      if (newId) navigate(`/lands/${newId}`)
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
          <h1>{admin ? 'Araziler' : 'Arazilerim'}</h1>
          <p>
            {admin
              ? 'Operasyonun merkezi. Arazi detayında üretici/uzman ataması, üretim planı, uyarılar ve notlar yönetilir.'
              : 'Size atanan araziler. Görev gönderimi, onay, üretici sohbeti ve saha işlemleri burada.'}
          </p>
        </div>
        {admin && (
          <button type="button" className="primary-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Formu kapat' : 'Yeni arazi'}
          </button>
        )}
      </div>

      <div className="panel" id="yeni-arazi">
        {showForm && admin && (
          <form className="form-grid two-col" onSubmit={onSubmit}>
            <label>
              Ad <span className="required-mark">*</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Örn. 10 nolu tarla"
              />
            </label>
            <label>
              Parsel no <span className="required-mark">*</span>
              <input
                value={form.parcelNumber}
                onChange={(e) => setForm({ ...form, parcelNumber: e.target.value })}
                required
              />
            </label>
            <label>
              Mahalle
              <input
                value={form.neighborhood}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                placeholder="Örn. Yeşilova"
              />
            </label>
            <label>
              Alan (dekar)
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.sizeInDecares}
                onChange={(e) => setForm({ ...form, sizeInDecares: Number(e.target.value) })}
                required
              />
            </label>
            <label>
              Ada / kadastro bloğu
              <input
                value={form.cadastralBlock}
                onChange={(e) => setForm({ ...form, cadastralBlock: e.target.value })}
                placeholder="İsteğe bağlı"
              />
            </label>
            <label>
              Toprak tipi
              <input
                value={form.soilType}
                onChange={(e) => setForm({ ...form, soilType: e.target.value })}
                placeholder="İsteğe bağlı"
              />
            </label>
            <label>
              Enlem (harita)
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="örn. 37.8746"
              />
            </label>
            <label>
              Boylam (harita)
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                placeholder="örn. 32.4932"
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Toprak notları
              <textarea
                value={form.soilNotes}
                onChange={(e) => setForm({ ...form, soilNotes: e.target.value })}
                rows={2}
                placeholder="İsteğe bağlı saha notu"
              />
            </label>
            <div style={{ gridColumn: '1 / -1' }}>
              <button className="primary-btn" type="submit" disabled={create.isPending}>
                {create.isPending ? 'Kaydediliyor…' : 'Kaydet ve aç'}
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
          <p className="empty">
            {admin
              ? 'Henüz arazi kaydı yok.'
              : 'Size atanmış arazi yok. Yönetici ataması bekleniyor.'}
          </p>
        ) : (
          <>
            <div className="list-search-wrap">
              <ListSearch
                value={search}
                onChange={setSearch}
                placeholder="Arazi adı, parsel, mahalle veya ürün ara…"
                resultCount={filteredItems.length}
                totalCount={items.length}
              />
            </div>
            {filteredItems.length === 0 ? (
              <p className="list-search-empty">Aramanızla eşleşen arazi bulunamadı.</p>
            ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Parsel</th>
                <th>Alan</th>
                <th>Üretim</th>
                <th>Uyarı</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="clickable-row"
                  onClick={() => navigate(`/lands/${item.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/lands/${item.id}`)
                    }
                  }}
                  tabIndex={0}
                  role="link"
                >
                  <td>{item.name}</td>
                  <td>{item.parcelNumber}</td>
                  <td>{item.sizeInDecares} da</td>
                  <td>
                    {item.activeWorkflowName
                      ? `${item.activeCropType ?? ''} · ${item.activeWorkflowName}`.trim()
                      : '—'}
                  </td>
                  <td>
                    {(item.alertCount ?? 0) > 0 ? (
                      <span className="badge">{item.alertCount}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Link to={`/lands/${item.id}`} className="ghost-btn">
                      Arazi Merkezi
                    </Link>
                    <Link to={`/lands/${item.id}#uretim`} className="ghost-btn">
                      Üretim planı
                    </Link>
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
