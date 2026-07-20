import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type {
  ConversationDetail,
  ConversationListItem,
  Land,
  Producer,
  StaffUser,
} from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isAdmin, isOfficer } from '../auth/roles'
import { ListSearch } from '../components/ListSearch'
import { matchesSearch } from '../utils/search'
import '../layout/layout.css'

/**
 * Global Mesajlar = Admin ↔ Tarım Uzmanı (Staff) only.
 * Producer ↔ uzman chat lives on the land detail hub.
 */
export function MessagesPage() {
  const { token, user } = useAuth()
  const admin = isAdmin(user?.roles)
  const officer = isOfficer(user?.roles)
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [staffSubject, setStaffSubject] = useState('Operasyon yazışması')
  const [staffOfficerId, setStaffOfficerId] = useState('')
  const [search, setSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const startFormRef = useRef<HTMLDivElement | null>(null)

  const listQuery = useQuery({
    queryKey: ['conversations', 'staff'],
    queryFn: () => api<ConversationListItem[]>('/api/conversations', {}, token),
    enabled: Boolean(token),
    refetchOnWindowFocus: true,
  })

  const officersQuery = useQuery({
    queryKey: ['officers'],
    queryFn: () => api<StaffUser[]>('/api/users/officers', {}, token),
    enabled: Boolean(token && admin),
  })

  const landsQuery = useQuery({
    queryKey: ['lands', 'messages-search'],
    queryFn: () => api<Land[]>('/api/lands', {}, token),
    enabled: Boolean(token),
  })

  const producersQuery = useQuery({
    queryKey: ['producers', 'messages-search'],
    queryFn: () => api<Producer[]>('/api/producers', {}, token),
    enabled: Boolean(token),
  })

  const detailQuery = useQuery({
    queryKey: ['conversation', selectedId],
    queryFn: () =>
      api<ConversationDetail>(`/api/conversations/${selectedId}`, {}, token),
    enabled: Boolean(token && selectedId),
    refetchOnWindowFocus: true,
  })

  const send = useMutation({
    mutationFn: () =>
      api(
        `/api/conversations/${selectedId}/messages`,
        { method: 'POST', body: JSON.stringify({ body }) },
        token,
      ),
    onSuccess: async () => {
      setBody('')
      await queryClient.invalidateQueries({ queryKey: ['conversation', selectedId] })
      await queryClient.invalidateQueries({ queryKey: ['conversations', 'staff'] })
    },
  })

  const startStaff = useMutation({
    mutationFn: () =>
      api(
        '/api/conversations/staff',
        {
          method: 'POST',
          body: JSON.stringify(
            admin
              ? { officerUserId: staffOfficerId || null, subject: staffSubject }
              : { subject: staffSubject },
          ),
        },
        token,
      ),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['conversations', 'staff'] })
      const conversationId =
        typeof result === 'string' ? result.replace(/"/g, '') : String(result).replace(/"/g, '')
      if (conversationId) setSelectedId(conversationId)
    },
  })

  useEffect(() => {
    const list = listQuery.data
    if (!selectedId && list && list.length > 0) setSelectedId(list[0].id)
  }, [listQuery.data, selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [detailQuery.data?.messages.length])

  function onSend(event: FormEvent) {
    event.preventDefault()
    if (!body.trim() || !selectedId) return
    send.mutate()
  }

  const threads = listQuery.data ?? []
  const detail = detailQuery.data
  const officers = officersQuery.data ?? []
  const lands = landsQuery.data ?? []
  const producers = producersQuery.data ?? []

  const officerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const officer of officers) map.set(officer.id, officer.fullName)
    return map
  }, [officers])

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads
    return threads.filter((thread) => {
      const officerName = thread.officerUserId
        ? officerNameById.get(thread.officerUserId)
        : undefined
      return matchesSearch(
        search,
        thread.subject,
        thread.lastMessagePreview,
        officerName,
      )
    })
  }, [threads, search, officerNameById])

  const quickLands = useMemo(() => {
    if (!search.trim()) return []
    return lands
      .filter((land) =>
        matchesSearch(
          search,
          land.name,
          land.parcelNumber,
          land.neighborhood,
          land.activeCropType,
        ),
      )
      .slice(0, 5)
  }, [lands, search])

  const quickProducers = useMemo(() => {
    if (!search.trim()) return []
    return producers
      .filter((producer) =>
        matchesSearch(
          search,
          producer.fullName,
          producer.phone,
          producer.email,
          producer.nationalId,
        ),
      )
      .slice(0, 5)
  }, [producers, search])

  const quickOfficers = useMemo(() => {
    if (!search.trim() || !admin) return []
    return officers
      .filter((officer) =>
        matchesSearch(search, officer.fullName, officer.email, officer.phoneNumber),
      )
      .slice(0, 5)
  }, [officers, search, admin])

  const hasQuickResults =
    quickLands.length > 0 || quickProducers.length > 0 || quickOfficers.length > 0

  function selectOfficerForChat(officerId: string, officerName: string) {
    setStaffOfficerId(officerId)
    setStaffSubject(`${officerName} — operasyon`)
    startFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Mesajlar</h1>
          <p>
            Yönetici ↔ Tarım Uzmanı personel kanalı. Üretici sohbetleri ilgili{' '}
            <strong>arazi merkezi</strong> sayfasındadır.
          </p>
        </div>
      </div>

      {(admin || officer) && (
        <div className="panel" style={{ marginBottom: 16 }} ref={startFormRef}>
          <p className="panel-title">
            {admin ? 'Uzman ile yazışma başlat' : 'Yöneticiye yaz'}
          </p>
          <form
            className="form-grid two-col"
            onSubmit={(e) => {
              e.preventDefault()
              if (admin && !staffOfficerId) return
              startStaff.mutate()
            }}
          >
            {admin && (
              <label>
                Tarım Uzmanı
                <select
                  value={staffOfficerId}
                  onChange={(e) => setStaffOfficerId(e.target.value)}
                  required
                >
                  <option value="">Seçin</option>
                  {(officersQuery.data ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.fullName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Konu
              <input
                value={staffSubject}
                onChange={(e) => setStaffSubject(e.target.value)}
                required
              />
            </label>
            <div className="row-actions" style={{ gridColumn: '1 / -1' }}>
              <button className="primary-btn" type="submit" disabled={startStaff.isPending}>
                {startStaff.isPending ? 'Açılıyor…' : 'Yazışmayı aç'}
              </button>
            </div>
            {startStaff.error && (
              <p className="error">{(startStaff.error as Error).message}</p>
            )}
          </form>
        </div>
      )}

      <div className="panel messages-layout">
        <div className="thread-list">
          <div className="messages-quick-search">
            <div className="list-search-wrap" style={{ borderBottom: 0, background: 'transparent', paddingBottom: 8 }}>
              <ListSearch
                value={search}
                onChange={setSearch}
                placeholder="Sohbet, arazi, üretici veya uzman ara…"
              />
            </div>
            {search.trim() && hasQuickResults ? (
              <div className="messages-quick-results">
                {quickLands.length > 0 ? (
                  <div className="messages-quick-group">
                    <p className="messages-quick-label">Araziler</p>
                    {quickLands.map((land) => (
                      <Link
                        key={land.id}
                        to={`/lands/${land.id}`}
                        className="messages-quick-item"
                      >
                        <strong>{land.name}</strong>
                        <span>{land.parcelNumber}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {quickProducers.length > 0 ? (
                  <div className="messages-quick-group">
                    <p className="messages-quick-label">Üreticiler</p>
                    {quickProducers.map((producer) => (
                      <Link
                        key={producer.id}
                        to={`/producers/${producer.id}`}
                        className="messages-quick-item"
                      >
                        <strong>{producer.fullName}</strong>
                        <span>{producer.phone || 'Detay'}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {quickOfficers.length > 0 ? (
                  <div className="messages-quick-group">
                    <p className="messages-quick-label">Uzmanlar</p>
                    {quickOfficers.map((officer) => (
                      <button
                        key={officer.id}
                        type="button"
                        className="messages-quick-item"
                        onClick={() => selectOfficerForChat(officer.id, officer.fullName)}
                      >
                        <strong>{officer.fullName}</strong>
                        <span>Yazışma aç</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {listQuery.isLoading && <p className="empty">Yükleniyor…</p>}
          {listQuery.error && (
            <p className="error empty">{(listQuery.error as Error).message}</p>
          )}
          {!listQuery.isLoading && threads.length === 0 && (
            <p className="empty">
              Personel yazışması yok. Yukarıdan yönetici↔uzman sohbeti başlatın.
            </p>
          )}
          {!listQuery.isLoading && threads.length > 0 && filteredThreads.length === 0 && (
            <p className="list-search-empty">Aramanızla eşleşen sohbet bulunamadı.</p>
          )}
          {filteredThreads.map((thread) => {
            const officerName = thread.officerUserId
              ? officerNameById.get(thread.officerUserId)
              : undefined
            return (
            <button
              key={thread.id}
              type="button"
              className={`thread-item${selectedId === thread.id ? ' active' : ''}`}
              onClick={() => setSelectedId(thread.id)}
            >
              <strong>{thread.subject}</strong>
              {officerName ? (
                <span className="thread-item-participant">{officerName}</span>
              ) : null}
              <span>{thread.lastMessagePreview ?? 'Mesaj yok'}</span>
            </button>
            )
          })}
        </div>

        <div className="chat-pane">
          {!selectedId ? (
            <p className="empty">Yanıtlamak için bir sohbet seçin.</p>
          ) : detailQuery.isLoading ? (
            <p className="empty">Yükleniyor…</p>
          ) : detailQuery.error ? (
            <p className="error empty">{(detailQuery.error as Error).message}</p>
          ) : detail ? (
            <>
              <div className="chat-header">{detail.subject} · Personel</div>
              <div className="chat-messages">
                {detail.messages.length === 0 && (
                  <p className="empty">Bu sohbette henüz mesaj yok.</p>
                )}
                {detail.messages.map((msg) => {
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
                <div ref={bottomRef} />
              </div>
              <form className="chat-compose" onSubmit={onSend}>
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Yanıtınızı yazın…"
                  required
                />
                <button className="primary-btn" type="submit" disabled={send.isPending}>
                  {send.isPending ? 'Gönderiliyor…' : 'Gönder'}
                </button>
              </form>
              {send.error && <p className="error empty">{(send.error as Error).message}</p>}
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}
