import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export type LightboxImage = {
  src: string
  alt?: string
  caption?: string
}

type LightboxProps = {
  images: LightboxImage[]
  /** Görüntülenen ilk fotoğrafın index'i. */
  startIndex?: number
  onClose: () => void
}

/**
 * Tam ekran fotoğraf görüntüleyici. ESC veya arkaplana tıklayınca kapanır;
 * birden fazla foto varsa ok tuşları / butonlarla gezinilir. Ek bağımlılık kullanmaz.
 */
export function Lightbox({ images, startIndex = 0, onClose }: LightboxProps) {
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    setIndex((prev) => {
      if (images.length === 0) return 0
      return Math.min(Math.max(prev, 0), images.length - 1)
    })
  }, [images.length])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length)
  }, [images.length])

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length)
  }, [images.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, goPrev, goNext])

  if (images.length === 0) return null

  const current = images[Math.min(index, images.length - 1)]
  const hasMultiple = images.length > 1

  return createPortal(
    <div
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Fotoğraf görüntüleyici"
      onClick={onClose}
    >
      <button
        type="button"
        className="lightbox-close"
        aria-label="Kapat"
        onClick={onClose}
      >
        <X size={22} aria-hidden />
      </button>

      {hasMultiple ? (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-prev"
          aria-label="Önceki fotoğraf"
          onClick={(e) => {
            e.stopPropagation()
            goPrev()
          }}
        >
          <ChevronLeft size={28} aria-hidden />
        </button>
      ) : null}

      <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
        <img className="lightbox-image" src={current.src} alt={current.alt ?? ''} />
        {current.caption || hasMultiple ? (
          <figcaption className="lightbox-caption">
            {current.caption ? <span>{current.caption}</span> : null}
            {hasMultiple ? (
              <span className="lightbox-counter">
                {index + 1} / {images.length}
              </span>
            ) : null}
          </figcaption>
        ) : null}
      </figure>

      {hasMultiple ? (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-next"
          aria-label="Sonraki fotoğraf"
          onClick={(e) => {
            e.stopPropagation()
            goNext()
          }}
        >
          <ChevronRight size={28} aria-hidden />
        </button>
      ) : null}
    </div>,
    document.body,
  )
}
