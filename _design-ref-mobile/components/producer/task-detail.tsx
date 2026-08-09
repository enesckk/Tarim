'use client'

import { Button } from '@/components/ui/button'
import { PhotoPicker } from '@/components/producer/photo-picker'
import { producer, type Task } from '@/lib/producer-data'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  MessageCircleWarning,
  Send,
} from 'lucide-react'
import { useState } from 'react'

export function TaskDetail({
  task,
  onBack,
  onComplete,
  onAskExpert,
  onReportProblem,
}: {
  task: Task
  onBack: () => void
  onComplete: (photos: string[], quantity?: string) => void
  onAskExpert: (task: Task) => void
  onReportProblem: (task: Task) => void
}) {
  const [photos, setPhotos] = useState<string[]>([])
  const [quantity, setQuantity] = useState('')

  const isDone = task.status === 'tamamlandi'
  const isOverdue = task.status === 'geciken'
  const needsPhoto = task.photoRequired && photos.length === 0
  const canComplete = !needsPhoto

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-card/95 px-2 py-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-xl text-foreground active:bg-muted"
          aria-label="Geri"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>
        <span className="text-sm font-medium text-muted-foreground">
          {task.workflow}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-4 pb-8">
        <header className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden="true" />
            {producer.field}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
            {task.title}
          </h1>
          <span
            className={cn(
              'text-sm font-medium',
              isOverdue ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {task.dueLabel}
          </span>
        </header>

        <p className="text-[15px] leading-relaxed text-foreground/90">
          {task.description}
        </p>

        {isDone ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="size-5" aria-hidden="true" />
              <span className="font-semibold">Tamamlandı</span>
            </div>
            {task.completedAt && (
              <p className="text-sm text-muted-foreground">{task.completedAt}</p>
            )}
            {task.photos && task.photos.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {task.photos.map((src, i) => (
                  <div
                    key={src}
                    className="size-28 overflow-hidden rounded-2xl border border-border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src || '/placeholder.svg'}
                      alt={`Kanıt fotoğrafı ${i + 1}`}
                      className="size-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <p className="text-sm font-semibold text-foreground">
                {task.photoRequired ? 'Fotoğraf (zorunlu)' : 'Fotoğraf (isteğe bağlı)'}
              </p>
              <PhotoPicker
                photos={photos}
                onAdd={(urls) => setPhotos((p) => [...p, ...urls])}
                onRemove={(i) =>
                  setPhotos((p) => p.filter((_, idx) => idx !== i))
                }
              />
            </div>

            {task.quantityLabel && (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="quantity"
                  className="text-sm font-semibold text-foreground"
                >
                  {task.quantityLabel}
                </label>
                <input
                  id="quantity"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="örn. 50"
                  className="h-12 rounded-xl border border-input bg-card px-4 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-2">
          {!isDone && (
            <>
              <Button
                onClick={() => onComplete(photos, quantity || undefined)}
                disabled={!canComplete}
                className="h-14 rounded-2xl text-base font-semibold"
              >
                <CheckCircle2 className="size-5" aria-hidden="true" />
                {needsPhoto ? 'Önce fotoğraf ekle' : 'Tamamla'}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={() => onAskExpert(task)}
                  className="h-12 rounded-xl text-sm font-medium"
                >
                  <Send className="size-4" aria-hidden="true" />
                  Uzmana sor
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onReportProblem(task)}
                  className="h-12 rounded-xl text-sm font-medium"
                >
                  <MessageCircleWarning className="size-4" aria-hidden="true" />
                  Sorun bildir
                </Button>
              </div>
            </>
          )}

          {isDone && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="h-12 rounded-xl text-sm font-medium"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Görevlere dön
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
