'use client'

import type { Task } from '@/lib/producer-data'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
} from 'lucide-react'

function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const isOverdue = task.status === 'geciken'
  const isDone = task.status === 'tamamlandi'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-muted"
    >
      <div
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          isDone && 'bg-primary/10 text-primary',
          isOverdue && 'bg-destructive/10 text-destructive',
          !isDone && !isOverdue && 'bg-accent text-accent-foreground',
        )}
      >
        {isDone ? (
          <CheckCircle2 className="size-6" aria-hidden="true" />
        ) : isOverdue ? (
          <AlertTriangle className="size-6" aria-hidden="true" />
        ) : (
          <Clock className="size-6" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-card-foreground">
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              'text-sm font-medium',
              isOverdue ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {task.dueLabel}
          </span>
          {task.photoRequired && !isDone && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Camera className="size-3" aria-hidden="true" />
              Foto gerekli
            </span>
          )}
        </div>
      </div>

      {!isDone && (
        <ChevronRight
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </button>
  )
}

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string
  count: number
  tone?: 'danger'
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <section className="flex flex-col gap-2.5">
      <h2
        className={cn(
          'px-1 text-xs font-semibold uppercase tracking-wide',
          tone === 'danger' ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {title} ({count})
      </h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

export function TaskList({
  tasks,
  onOpenTask,
}: {
  tasks: Task[]
  onOpenTask: (id: string) => void
}) {
  const overdue = tasks.filter((t) => t.status === 'geciken')
  const today = tasks.filter((t) => t.status === 'bugun')
  const openCount = overdue.length + today.length

  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      {openCount === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </div>
          <p className="mt-1 text-base font-semibold text-card-foreground">
            Bugünlük her şey tamam
          </p>
          <p className="text-sm text-muted-foreground text-pretty">
            Açık görevin yok. Tüm sürecini görmek için Süreç sekmesine bak.
          </p>
        </div>
      ) : (
        <>
          <Section title="Geciken" count={overdue.length} tone="danger">
            {overdue.map((t) => (
              <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t.id)} />
            ))}
          </Section>

          <Section title="Bugün" count={today.length}>
            {today.map((t) => (
              <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t.id)} />
            ))}
          </Section>
        </>
      )}
    </div>
  )
}
