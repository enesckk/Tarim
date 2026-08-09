'use client'

import { Button } from '@/components/ui/button'
import { PhotoPicker } from '@/components/producer/photo-picker'
import type { Task } from '@/lib/producer-data'
import { MapPin, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export type ProblemDraft = {
  title: string
  description: string
  photos: string[]
  taskTitle?: string
}

export function ReportProblemSheet({
  open,
  contextTask,
  onClose,
  onSubmit,
}: {
  open: boolean
  contextTask?: Task | null
  onClose: () => void
  onSubmit: (draft: ProblemDraft) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setPhotos([])
    }
  }, [open])

  if (!open) return null

  const canSubmit = title.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />

      <div
        className="relative mx-auto flex w-full max-w-md flex-col rounded-t-3xl border-t border-border bg-card p-5 shadow-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Sorun bildir"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-card-foreground">Sorun bildir</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
            aria-label="Kapat"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {contextTask && (
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden="true" />
            {contextTask.title}
          </span>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-title" className="text-sm font-semibold text-foreground">
              Ne oldu? (zorunlu)
            </label>
            <input
              id="p-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="örn. Sulama hattında sızıntı"
              className="h-12 rounded-xl border border-input bg-background px-4 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="p-desc"
              className="text-sm font-semibold text-foreground"
            >
              Kısa açıklama
            </label>
            <textarea
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detay ekleyebilirsin…"
              className="resize-none rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">
              Fotoğraf (isteğe bağlı)
            </p>
            <PhotoPicker
              photos={photos}
              onAdd={(urls) => setPhotos((p) => [...p, ...urls])}
              onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))}
            />
          </div>
        </div>

        <Button
          onClick={() =>
            onSubmit({
              title: title.trim(),
              description: description.trim(),
              photos,
              taskTitle: contextTask?.title,
            })
          }
          disabled={!canSubmit}
          className="mt-5 h-14 rounded-2xl text-base font-semibold"
        >
          Gönder
        </Button>
      </div>
    </div>
  )
}
