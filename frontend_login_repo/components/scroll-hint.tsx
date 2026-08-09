'use client'

import { ChevronDown } from 'lucide-react'

export function ScrollHint({
  active,
  total,
}: {
  active: number
  total: number
}) {
  const atEnd = active >= total
  return (
    <div
      className="pointer-events-none fixed bottom-7 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2.5 transition-opacity duration-500 md:left-[calc(50%+140px)]"
      style={{ opacity: atEnd ? 0 : 1 }}
      aria-hidden="true"
    >
      <div className="relative flex h-9 w-5 items-start justify-center rounded-full border border-white/25 pt-1.5">
        <span className="h-1.5 w-1 animate-scroll-dot rounded-full bg-white/70" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
          Aşağı Kaydır
        </span>
        <ChevronDown className="h-3.5 w-3.5 animate-bounce text-white/45" strokeWidth={1.5} />
      </div>
    </div>
  )
}
