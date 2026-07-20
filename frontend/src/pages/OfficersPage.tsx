import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { StaffUser } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin } from '../auth/roles'
import { Navigate } from 'react-router-dom'
import { ListSearch } from '../components/ListSearch'
import { matchesSearch } from '../utils/search'
import '../layout/layout.css'

export function OfficersPage() {
  const { token, user } = useAuth()
  const admin = isAdmin(user?.roles)
  const [search, setSearch] = useState('')

  const { data: items = [], error, isLoading } = useQuery({
    queryKey: ['staff-officers'],
    queryFn: () => api<StaffUser[]>('/api/staff/officers', {}, token),
    enabled: Boolean(token && admin),
  })

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    return items.filter((item) =>
      matchesSearch(search, item.fullName, item.email, item.phoneNumber),
    )
  }, [items, search])

  if (!admin) return <Navigate to="/" replace />

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Tarım uzmanları</h1>
          <p>Officer rolündeki personel — iletişim bilgileri.</p>
        </div>
      </div>

      <div className="panel">
        {error && <p className="error empty">{(error as Error).message}</p>}
        {isLoading ? (
          <p className="empty">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <p className="empty">Kayıtlı tarım uzmanı yok.</p>
        ) : (
          <>
            <div className="list-search-wrap">
              <ListSearch
                value={search}
                onChange={setSearch}
                placeholder="Ad, e-posta veya telefon ara…"
                resultCount={filteredItems.length}
                totalCount={items.length}
              />
            </div>
            {filteredItems.length === 0 ? (
              <p className="list-search-empty">Aramanızla eşleşen uzman bulunamadı.</p>
            ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ad soyad</th>
                <th>E-posta</th>
                <th>Telefon</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.fullName}</td>
                  <td>
                    {item.email ? (
                      <a href={`mailto:${item.email}`}>{item.email}</a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {item.phoneNumber ? (
                      <a href={`tel:${item.phoneNumber}`}>{item.phoneNumber}</a>
                    ) : (
                      '—'
                    )}
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
