import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { TaskDto } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { isOfficer, isProducer } from '../auth/roles'

export function TaskDetailPage() {
  const { taskId } = useParams()
  const { authFetch, accessToken, user } = useAuth()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => authFetch<TaskDto>(`/api/tasks/${taskId}`),
    enabled: Boolean(taskId),
  })

  const complete = useMutation({
    mutationFn: async () => {
      if (!taskId) return
      if (file) {
        const form = new FormData()
        form.append('file', file)
        await authFetch(`/api/tasks/${taskId}/photos`, { method: 'POST', body: form })
      }
      await authFetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ notes: notes.trim() || null }),
      })
    },
    onSuccess: async () => {
      setMessage('Görev gönderildi, onay bekleniyor.')
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Tamamlanamadı'),
  })

  const approve = useMutation({
    mutationFn: () => authFetch(`/api/tasks/${taskId}/approve`, { method: 'POST' }),
    onSuccess: async () => {
      setMessage('Görev onaylandı.')
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })

  const task = taskQuery.data

  return (
    <section className="page">
      <Link to="/tasks" className="back-link">
        ← Görevlere dön
      </Link>
      {taskQuery.isLoading ? <p className="empty">Yükleniyor…</p> : null}
      {taskQuery.isError ? <p className="error">Görev yüklenemedi.</p> : null}
      {task ? (
        <>
          <header className="page-head">
            <h1>{task.title}</h1>
            <p className="muted">{task.landName || 'Arazi'}</p>
          </header>
          {task.description ? <p>{task.description}</p> : null}
          {task.revisionReason ? <p className="error">Revize: {task.revisionReason}</p> : null}

          {isProducer(user?.roles) && task.status !== 2 && task.status !== 5 ? (
            <form
              className="stack"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                if (task.requiresPhoto && !file) {
                  setMessage('Bu görev için fotoğraf gerekli.')
                  return
                }
                complete.mutate()
              }}
            >
              <label>
                Not
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </label>
              <label>
                Fotoğraf {task.requiresPhoto ? '*' : '(isteğe bağlı)'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button className="btn primary" type="submit" disabled={complete.isPending || !accessToken}>
                {complete.isPending ? 'Gönderiliyor…' : 'Görevi tamamla'}
              </button>
            </form>
          ) : null}

          {isOfficer(user?.roles) && task.status === 5 ? (
            <button
              type="button"
              className="btn primary"
              disabled={approve.isPending}
              onClick={() => approve.mutate()}
            >
              Onayla
            </button>
          ) : null}

          {message ? <p className="muted">{message}</p> : null}
        </>
      ) : null}
    </section>
  )
}
