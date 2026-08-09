'use client'

import { Button } from '@/components/ui/button'
import { producer } from '@/lib/producer-data'
import { LogOut, MapPin, Phone, Sprout, User } from 'lucide-react'

export function ProfileView({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex flex-col gap-6 p-4 pb-6">
      <header className="px-1 pt-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Profil
        </h1>
      </header>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-8" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-card-foreground">
            {producer.name}
          </p>
          <p className="text-sm text-muted-foreground">Üretici</p>
        </div>
      </div>

      <ul className="overflow-hidden rounded-2xl border border-border bg-card">
        <Row icon={Phone} label="Telefon" value={producer.phone} />
        <Row icon={MapPin} label="Arazi" value={producer.field} divider />
        <Row icon={Sprout} label="Ürün" value={producer.crop} divider />
      </ul>

      <Button
        variant="outline"
        onClick={onLogout}
        className="h-14 w-full rounded-2xl border-destructive/30 text-base font-semibold text-destructive hover:bg-destructive/10"
      >
        <LogOut className="size-5" aria-hidden="true" />
        Çıkış yap
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Tarla — Üretici · Belediye Tarım Programı
      </p>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  divider,
}: {
  icon: typeof Phone
  label: string
  value: string
  divider?: boolean
}) {
  return (
    <li
      className={
        divider ? 'flex items-center gap-3 border-t border-border p-4' : 'flex items-center gap-3 p-4'
      }
    >
      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-[15px] font-medium text-card-foreground">
          {value}
        </p>
      </div>
    </li>
  )
}
