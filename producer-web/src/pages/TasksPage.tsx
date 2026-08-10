import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { TaskDto } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { isOfficer } from '../auth/roles'

function statusLabel(status: number) {
  if (status === 5) return 'Onay bekliyor'
  if (status === 3) return 'Revize'
  if (status === 2) return 'Tamamlandı'
  if (status === 4) return 'İptal'
  return 'Açık'
}

export function TasksPage() {
  const { authFetch, user } = useAuth()
  const officer = isOfficer(user?.roles)

  const tasksQuery = useQuery({
    queryKey: ['tasks', officer ? 'pending' : 'today'],
    queryFn: () =>
      authFetch<TaskDto[]>(officer ? '/api/tasks/pending-approval' : '/api/tasks/today'),
    refetchInterval: 60_000,
  })

  const tasks = tasksQuery.data ?? []

  return (
    <section className="page">
      <header className="page-head">
        <h1>{officer ? 'Onaylar' : 'Görevler'}</h1>
        <p className="muted">{officer ? 'Bekleyen görev onayları' : 'Bugünkü ve açık işleriniz'}</p>
      </header>

      {tasksQuery.isLoading ? <p className="empty">Yükleniyor…</p> : null}
      {tasksQuery.isError ? (
        <p className="error">
          Görevler yüklenemedi.{' '}
          <button type="button" className="link" onClick={() => void tasksQuery.refetch()}>
            Yenile
          </button>
        </p>
      ) : null}
      {!tasksQuery.isLoading && !tasksQuery.isError && tasks.length === 0 ? (
        <p className="empty">Şu an görev yok.</p>
      ) : null}

      <ul className="card-list">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link to={`/tasks/${task.id}`} className="card-link">
              <strong>{task.title}</strong>
              <span>
                {(task.landName || 'Arazi').trim()} · {statusLabel(task.status)}
              </span>
              {task.dueDate ? (
                <em>Vade: {new Date(task.dueDate).toLocaleDateString('tr-TR')}</em>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
