'use client'

import { cn } from '@/lib/utils'
import { Camera, X } from 'lucide-react'
import { useRef } from 'react'

export function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  label = 'Fotoğraf ekle',
  className,
}: {
  photos: string[]
  onAdd: (urls: string[]) => void
  onRemove: (index: number) => void
  label?: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const urls = Array.from(files).map((f) => URL.createObjectURL(f))
    onAdd(urls)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap gap-3">
        {photos.map((src, i) => (
          <div
            key={src}
            className="relative size-24 overflow-hidden rounded-2xl border border-border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src || '/placeholder.svg'}
              alt={`Yüklenen fotoğraf ${i + 1}`}
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-foreground/70 text-background"
              aria-label="Fotoğrafı kaldır"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex size-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Camera className="size-6" aria-hidden="true" />
          <span className="text-[11px] font-medium">{label}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
