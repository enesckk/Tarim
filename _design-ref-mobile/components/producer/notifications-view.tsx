'use client'

import type { AppNotification } from '@/lib/producer-data'
import { cn } from '@/lib/utils'
import { AlertTriangle, BellOff, ClipboardPlus, MessageSquare } from 'lucide-react'

const iconFor = {
  gecikme: AlertTriangle,
  yeni_gorev: ClipboardPlus,
  uzman: MessageSquare,
} as const

export function NotificationsView({
  notifications,
  onOpen,
}: {
  notifications: AppNotification[]
  onOpen: (n: AppNotification) => void
}) {
  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      <header className="px-1 pt-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Bildirimler
        </h1>
      </header>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <BellOff className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Yeni bildirim yok</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {notifications.map((n) => {
            const Icon = iconFor[n.type]
            const isDanger = n.type === 'gecikme'
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onOpen(n)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-muted"
                >
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl',
                      isDanger
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-accent text-accent-foreground',
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-card-foreground">
                        {n.title}
                      </p>
                      {!n.read && (
                        <span
                          className="size-2 shrink-0 rounded-full bg-primary"
                          aria-label="Okunmadı"
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm leading-snug text-muted-foreground text-pretty">
                      {n.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      {n.time}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
