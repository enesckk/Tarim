'use client'

import React, { useEffect, useState, memo } from 'react'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'

interface PreloaderProps {
  onComplete?: () => void
}

function PreloaderComponent({ onComplete }: PreloaderProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [progress, setProgress] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    // Lock background scroll during preloader
    document.body.style.overflow = 'hidden'

    const startTime = Date.now()
    const duration = 2000 // 2.0s cinematic load time

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const rawProgress = Math.min(1, elapsed / duration)
      // Ease out quad
      const eased = 1 - (1 - rawProgress) * (1 - rawProgress)
      const currentVal = Math.floor(eased * 100)

      setProgress(currentVal)

      if (rawProgress >= 1) {
        clearInterval(timer)
        setIsFading(true)
        setTimeout(() => {
          setIsHidden(true)
          document.body.style.overflow = ''
          if (onComplete) onComplete()
        }, 600) // Match fade out duration
      }
    }, 20)

    return () => {
      clearInterval(timer)
      document.body.style.overflow = ''
    }
  }, [onComplete])

  if (isHidden) return null

  const getStatusText = () => {
    if (progress < 30) return 'T.C. ŞEHİTKAMİL BELEDİYESİ'
    if (progress < 60) return 'AGROPARK UYDU VERİLERİ YÜKLENİYOR...'
    if (progress < 90) return 'SÖZLEŞMELİ TARIM SAHASI HAZIRLANIYOR...'
    return 'ŞEHİTKAMİL TARIM EKOSİSTEMİNE HOŞ GELDİNİZ'
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-700 ease-out select-none pointer-events-auto',
        isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100',
        isLight ? 'bg-[#FAF8F3] text-[#1E1E1E]' : 'bg-[#060807] text-white',
      )}
    >
      {/* Background Ambient Glows */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] opacity-25 animate-pulse',
          isLight ? 'bg-[#B8842F]' : 'bg-[#D6AE5E]',
        )}
      />

      {/* Main Center Content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-sm px-4">
        {/* Glowing Logo Container */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 animate-in zoom-in-90 duration-500">
          <div
            className={cn(
              'absolute inset-0 rounded-full blur-xl opacity-50 animate-ping',
              isLight ? 'bg-[#9E6F22]' : 'bg-[#D6AE5E]',
            )}
          />
          <Image
            src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
            alt="Şehitkamil Strateji Logo"
            width={96}
            height={96}
            priority
            className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
          />
        </div>

        {/* Corporate Title Badge */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-extrabold tracking-widest uppercase bg-[#9E6F22]/10 text-[#9E6F22] dark:text-[#D6AE5E] border border-current/20">
            <Sparkles className="w-3 h-3 animate-spin" />
            <span>STRATEJİ VE GELİŞTİRME MERKEZİ</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-sans font-extrabold tracking-widest uppercase">
            ŞEHİTKAMİL TARIM
          </h1>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full space-y-2 pt-2">
          <div
            className={cn(
              'h-1.5 w-full rounded-full overflow-hidden border p-0.5 backdrop-blur-md',
              isLight ? 'border-[#B8842F]/30 bg-white/80' : 'border-white/20 bg-black/60',
            )}
          >
            <div
              className={cn(
                'h-full rounded-full transition-all duration-150 ease-out',
                isLight ? 'bg-[#9E6F22]' : 'bg-[#D6AE5E]',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Label & Counter */}
          <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-widest opacity-80 pt-1">
            <span className="truncate pr-2">{getStatusText()}</span>
            <span className="shrink-0 text-[#9E6F22] dark:text-[#D6AE5E] font-extrabold">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Preloader = memo(PreloaderComponent)
