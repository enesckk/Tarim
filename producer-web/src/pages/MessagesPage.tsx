import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import type { ConversationDetail, ConversationListItem } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function MessagesPage() {
  const { authFetch } = useAuth()
  const listQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => authFetch<ConversationListItem[]>('/api/conversations/expert'),
    refetchInterval: 30_000,
  })
  const items = listQuery.data ?? []

  return (
    <section className="page">
      <header className="page-head">
        <h1>Sohbet</h1>
        <p className="muted">Uzman ile yazışmalarınız</p>
      </header>
      {listQuery.isLoading ? <p className="empty">Yükleniyor…</p> : null}
      {listQuery.isError ? <p className="error">Sohbetler yüklenemedi.</p> : null}
      {!listQuery.isLoading && items.length === 0 ? (
        <p className="empty">Henüz sohbet yok.</p>
      ) : null}
      <ul className="card-list">
        {items.map((c) => (
          <li key={c.id}>
            <Link to={`/messages/${c.id}`} className="card-link">
              <strong>{c.subject}</strong>
              <span>{c.lastMessagePreview || 'Mesaj yok'}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ChatThreadPage() {
  const { conversationId } = useParams()
  const { authFetch, user } = useAuth()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')

  const detailQuery = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => authFetch<ConversationDetail>(`/api/conversations/${conversationId}`),
    enabled: Boolean(conversationId),
    refetchInterval: 8_000,
  })

  const send = useMutation({
    mutationFn: () =>
      authFetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: async () => {
      setBody('')
      await queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
    },
  })

  const detail = detailQuery.data

  return (
    <section className="page chat-page">
      <Link to="/messages" className="back-link">
        ← Sohbetlere dön
      </Link>
      <h1>{detail?.subject || 'Sohbet'}</h1>
      {detailQuery.isLoading ? <p className="empty">Yükleniyor…</p> : null}
      <div className="chat-log">
        {(detail?.messages ?? []).map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.senderUserId === user?.userId ? 'mine' : 'theirs'}`}
          >
            <p>{m.body}</p>
            <time>{new Date(m.sentAtUtc).toLocaleString('tr-TR')}</time>
          </div>
        ))}
      </div>
      <form
        className="chat-compose"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!body.trim()) return
          send.mutate()
        }}
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Mesaj yazın…"
          required
        />
        <button className="btn primary" type="submit" disabled={send.isPending}>
          Gönder
        </button>
      </form>
    </section>
  )
}
