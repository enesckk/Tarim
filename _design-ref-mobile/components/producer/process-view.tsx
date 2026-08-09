'use client'

import type { WorkflowStep } from '@/lib/producer-data'
import { cn } from '@/lib/utils'
import { Check, ChevronRight } from 'lucide-react'

function StepRow({
  step,
  isLast,
  onOpenStep,
}: {
  step: WorkflowStep
  isLast: boolean
  onOpenStep: (id: string) => void
}) {
  const done = step.state === 'bitti'
  const current = step.state === 'suanki'
  const actionable = current && !!step.taskId

  const node = (
    <div className="flex gap-3.5">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
            done && 'border-primary bg-primary text-primary-foreground',
            current && 'border-primary bg-primary/10 text-primary',
            !done && !current && 'border-border bg-card text-muted-foreground',
          )}
        >
          {done ? (
            <Check className="size-4" aria-hidden="true" />
          ) : current ? (
            <span className="size-2.5 rounded-full bg-primary" />
          ) : null}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1',
              done ? 'bg-primary/40' : 'bg-border',
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn('min-w-0 flex-1', isLast ? 'pb-1' : 'pb-6')}>
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-base font-semibold',
              current
                ? 'text-foreground'
                : done
                  ? 'text-foreground'
                  : 'text-muted-foreground',
            )}
          >
            {step.title}
          </p>
          {current && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Şimdi
            </span>
          )}
        </div>
        <p
          className={cn(
            'mt-0.5 text-sm leading-relaxed',
            done || !current ? 'text-muted-foreground' : 'text-foreground/70',
          )}
        >
          {step.detail}
        </p>
        {done && step.doneLabel && (
          <p className="mt-1 text-xs font-medium text-primary">
            Tamamlandı · {step.doneLabel}
          </p>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          {actionable ? 'Bilgi & göreve git' : 'Bilgi & talimat'}
          <ChevronRight className="size-4" aria-hidden="true" />
        </span>
      </div>
    </div>
  )

  return (
    <button
      type="button"
      onClick={() => onOpenStep(step.id)}
      className="w-full rounded-2xl text-left transition-colors active:bg-muted/60"
    >
      {node}
    </button>
  )
}

export function ProcessView({
  steps,
  workflowName,
  season,
  onOpenTask,
}: {
  steps: WorkflowStep[]
  workflowName: string
  season: string
  onOpenTask: (id: string) => void
}) {
  const doneCount = steps.filter((s) => s.state === 'bitti').length
  const total = steps.length
  const pct = Math.round((doneCount / total) * 100)

  return (
    <div className="flex flex-col gap-5 p-4 pb-6">
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {season}
        </p>
        <h2 className="mt-0.5 text-lg font-bold text-card-foreground">
          {workflowName}
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Süreç ilerlemesi"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-foreground">
            {doneCount}/{total}
          </span>
        </div>
      </section>

      <section>
        <div className="flex flex-col">
          {steps.map((step, i) => (
            <StepRow
              key={step.id}
              step={step}
              isLast={i === steps.length - 1}
              onOpenTask={onOpenTask}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
