'use client'

import { cn } from '@/lib/utils'
import { Bell, ClipboardList, MessageSquare, User } from 'lucide-react'

export type Tab = 'gorevler' | 'sohbet' | 'bildirimler' | 'profil'

const items: { key: Tab; label: string; icon: typeof ClipboardList }[] = [
  { key: 'gorevler', label: 'Görevler', icon: ClipboardList },
  { key: 'sohbet', label: 'Sohbet', icon: MessageSquare },
  { key: 'bildirimler', label: 'Bildirimler', icon: Bell },
  { key: 'profil', label: 'Profil', icon: User },
]

export function BottomNav({
  active,
  onChange,
  badges,
}: {
  active: Tab
  onChange: (tab: Tab) => void
  badges?: Partial<Record<Tab, number>>
}) {
  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Ana gezinme"
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          const badge = badges?.[key] ?? 0
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(key)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-16 w-full flex-col items-center justify-center gap-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span className="relative">
                  <Icon
                    className={cn('size-6', isActive && 'stroke-[2.4]')}
                    aria-hidden="true"
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
