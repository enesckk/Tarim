'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'

export function Preloader() {
  const [progress, setProgress] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const { theme } = useTheme()
  const isLight = theme === 'light'

  useEffect(() => {
    // Fast lightweight progress increment
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => setIsLoaded(true), 80)
          return 100
        }
        const diff = Math.max(2, Math.floor((100 - prev) / 3))
        return Math.min(100, prev + diff)
      })
    }, 20)

    return () => clearInterval(interval)
  }, [])

  if (isLoaded) return null

  const getStatusText = () => {
    if (progress < 30) return 'SİSTEM MODÜLLERİ YÜKLENİYOR...'
    if (progress < 60) return 'UYDU & ARAZİ VERİLERİ İŞLENİYOR...'
    if (progress < 90) return 'ŞEKABEL EKOSİSTEMİ HAZIRLANANİYOR...'
    return 'YÜKLEME TAMAMLANDI'
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 gpu-accelerated select-none',
        isLight ? 'bg-[#F8F7F2] text-[#1E1E1E]' : 'bg-[#060807] text-white',
      )}
    >
      {/* Background Ambient Glows */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] opacity-25 animate-pulse',
          isLight ? 'bg-[#3D6436]' : 'bg-[#588B4B]',
        )}
      />

      {/* Main Center Content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-sm px-4">
        {/* Glowing Logo Container */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 animate-in zoom-in-90 duration-500">
          <div
            className={cn(
              'absolute inset-0 rounded-full blur-xl opacity-50 animate-ping',
              isLight ? 'bg-[#3D6436]' : 'bg-[#6B9E5E]',
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-extrabold tracking-widest uppercase bg-[#3D6436]/10 text-[#3D6436] dark:text-[#6B9E5E] border border-current/20">
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
              isLight ? 'border-[#3D6436]/30 bg-white/80' : 'border-white/20 bg-black/60',
            )}
          >
            <div
              className={cn(
                'h-full rounded-full transition-all duration-150 ease-out',
                isLight ? 'bg-[#3D6436]' : 'bg-[#6B9E5E]',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Label & Counter */}
          <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-widest opacity-80 pt-1">
            <span className="truncate pr-2">{getStatusText()}</span>
            <span className="shrink-0 text-[#3D6436] dark:text-[#6B9E5E] font-extrabold">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
