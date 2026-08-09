'use client'

import React, { useState, useRef, memo } from 'react'
import Image from 'next/image'
import { Sparkles, SlidersHorizontal } from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'

function LandSliderComponent() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [sliderPos, setSliderPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = Math.min(100, Math.max(0, (x / rect.width) * 100))
    setSliderPos(percent)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX)
    }
  }

  return (
    <div className="w-full mt-5 reveal space-y-2">
      <div className="flex items-center justify-between text-[10px] font-mono font-extrabold tracking-widest uppercase">
        <span className={cn('flex items-center gap-1', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')}>
          <Sparkles className="w-3 h-3" />
          <span>İNTERAKTİF DÖNÜŞÜM İNCELEME</span>
        </span>
        <span className="opacity-70">{Math.round(sliderPos)}% VERİMLİLİK</span>
      </div>

      {/* Slider Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className={cn(
          'relative w-full h-[180px] sm:h-[220px] rounded-2xl overflow-hidden border shadow-xl cursor-ew-resize select-none touch-none',
          isLight ? 'border-[#B8842F]/30' : 'border-white/20',
        )}
      >
        {/* Layer 1: Right Image (Verimli Yeşil Üretim Tarlası) */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={isLight ? '/chapters/uretim-light.png' : '/chapters/uretim.png'}
            alt="Verimli Üretim Tarlası"
            fill
            className="object-cover"
          />
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-400 font-mono text-[9.5px] font-extrabold tracking-widest uppercase">
            SONRA: VERİMLİ ÜRETİM
          </div>
        </div>

        {/* Layer 2: Left Image (Atıl Arazi - Clipped by sliderPos) */}
        <div
          className="absolute inset-y-0 left-0 h-full overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="relative w-full h-full min-w-[300px] sm:min-w-[500px]">
            <Image
              src={isLight ? '/chapters/analiz-light.png' : '/chapters/analiz.png'}
              alt="Atıl Arazi Tespit"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-amber-500/40 text-amber-400 font-mono text-[9.5px] font-extrabold tracking-widest uppercase whitespace-nowrap">
              ÖNCE: ATIL ARAZİ
            </div>
          </div>
        </div>

        {/* Handle Divider Bar */}
        <div
          className="absolute inset-y-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] z-30"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-black border border-black/20 shadow-2xl flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  )
}

export const LandSlider = memo(LandSliderComponent)
