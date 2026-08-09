'use client'

import type { WorkflowStep } from '@/lib/producer-data'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Info,
  Lightbulb,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

function stateLabel(step: WorkflowStep) {
  if (step.state === 'bitti')
    return { text: `Tamamlandı${step.doneLabel ? ` · ${step.doneLabel}` : ''}`, tone: 'done' as const }
  if (step.state === 'suanki') return { text: 'Şu anki adım', tone: 'current' as const }
  return { text: 'Sıradaki adımlardan', tone: 'future' as const }
}

export function StepDetail({
  step,
  onBack,
  onOpenTask,
}: {
  step: WorkflowStep
  onBack: () => void
  onOpenTask: (id: string) => void
}) {
  const status = stateLabel(step)
  const actionable = step.state === 'suanki' && !!step.taskId

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-2 py-2 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="flex size-11 items-center justify-center rounded-xl text-foreground transition-colors active:bg-muted"
          aria-label="Geri"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">
            {step.title}
          </p>
          <p
            className={cn(
              'text-xs font-medium',
              status.tone === 'done' && 'text-primary',
              status.tone === 'current' && 'text-primary',
              status.tone === 'future' && 'text-muted-foreground',
            )}
          >
            {status.text}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-4 pb-8">
        {/* Ne yapılacak */}
        {step.guide && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <Info className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-card-foreground">
                Ne yapılacak?
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {step.guide}
            </p>
          </section>
        )}

        {/* Dikkat edilecekler */}
        {step.tips && step.tips.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-card-foreground">
                Dikkat edilecekler
              </h2>
            </div>
            <ul className="flex flex-col gap-2.5">
              {step.tips.map((tip, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-sm leading-relaxed text-foreground/80 text-pretty">
                    {tip}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Uzman & yönetici notları */}
        {step.notes && step.notes.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-sm font-semibold text-foreground">
              Uzman &amp; yönetici notları
            </h2>
            {step.notes.map((note) => {
              const isExpert = note.role === 'Tarım Uzmanı'
              return (
                <article
                  key={note.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full',
                        isExpert
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-foreground',
                      )}
                    >
                      {isExpert ? (
                        <ShieldCheck className="size-4.5" aria-hidden="true" />
                      ) : (
                        <UserRound className="size-4.5" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-card-foreground">
                        {note.author}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {note.role} · {note.time}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-foreground/80 text-pretty">
                    {note.text}
                  </p>
                </article>
              )
            })}
          </section>
        )}

        {(!step.notes || step.notes.length === 0) &&
          !step.guide &&
          (!step.tips || step.tips.length === 0) && (
            <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Bu adım için henüz bilgi eklenmedi.
            </p>
          )}
      </div>

      {actionable && step.taskId && (
        <div className="sticky bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur">
          <Button
            onClick={() => onOpenTask(step.taskId as string)}
            className="h-14 w-full rounded-2xl text-base font-semibold"
          >
            Göreve git
            <ChevronRight className="size-5" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}
