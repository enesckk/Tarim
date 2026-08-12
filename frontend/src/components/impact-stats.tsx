'use client'

import React, { useEffect, useState, useRef, memo } from 'react'
import { Activity, Sprout, ShieldCheck, TrendingUp } from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'

interface StatItem {
  id: string
  label: string
  target: number
  suffix: string
  prefix?: string
  subText: string
  icon: React.ComponentType<{ className?: string }>
}

const STATS: StatItem[] = [
  {
    id: 'arazi',
    label: 'ANALİZ EDİLEN ARAZİ',
    target: 120000,
    suffix: ' Dönüm',
    subText: 'Uydu & Dron İle Haritalandı',
    icon: Activity,
  },
  {
    id: 'ciftci',
    label: 'KAYITLI ÇİFTÇİ ORTAK',
    target: 8500,
    suffix: '+ Çiftçi',
    subText: 'Sözleşmeli Üretim Ağı',
    icon: Sprout,
  },
  {
    id: 'garanti',
    label: 'ALIM GARANTİSİ',
    target: 100,
    prefix: '%',
    suffix: ' Tam Güvence',
    subText: 'Şekabel Kooperatifi İle',
    icon: ShieldCheck,
  },
  {
    id: 'ekonomi',
    label: 'BÖLGE EKONOMİSİNE KATKI',
    target: 450,
    prefix: '₺',
    suffix: ' Milyon+',
    subText: 'Yerel İstihdam & Kazanç',
    icon: TrendingUp,
  },
]

function ImpactStatsComponent() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({
    arazi: 0,
    ciftci: 0,
    garanti: 0,
    ekonomi: 0,
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const startTime = Date.now()
    const duration = 1800 // 1.8 seconds smooth animation

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      setCounts({
        arazi: Math.floor(easeProgress * 120000),
        ciftci: Math.floor(easeProgress * 8500),
        garanti: Math.floor(easeProgress * 100),
        ekonomi: Math.floor(easeProgress * 450),
      })

      if (progress >= 1) clearInterval(timer)
    }, 20)

    return () => clearInterval(timer)
  }, [isVisible])

  return (
    <div
      ref={containerRef}
      className="w-full mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 reveal"
    >
      {STATS.map((stat) => {
        const Icon = stat.icon
        const val = counts[stat.id] || 0
        const formattedVal = stat.id === 'arazi' ? val.toLocaleString('tr-TR') : val

        return (
          <div
            key={stat.id}
            className={cn(
              'p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.03] shadow-md group relative overflow-hidden',
              isLight
                ? 'bg-white/90 border-[#B8842F]/25 text-[#1E1E1E] hover:border-[#9E6F22]'
                : 'bg-black/60 border-white/15 text-white hover:border-[#D6AE5E]',
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className={cn(
                  'text-[9px] sm:text-[10px] font-mono font-extrabold tracking-widest uppercase truncate',
                  isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]',
                )}
              >
                {stat.label}
              </span>
              <div
                className={cn(
                  'w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-12',
                  isLight
                    ? 'border-[#9E6F22]/30 bg-[#FAF8F3] text-[#9E6F22]'
                    : 'border-[#D6AE5E]/30 bg-white/5 text-[#D6AE5E]',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="font-mono text-lg sm:text-xl font-extrabold tracking-tight">
              {stat.prefix}
              {formattedVal}
              {stat.suffix}
            </div>

            <p
              className={cn(
                'text-[9.5px] font-sans font-medium mt-1 truncate opacity-75',
                isLight ? 'text-[#333735]' : 'text-slate-300',
              )}
            >
              {stat.subText}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export const ImpactStats = memo(ImpactStatsComponent)
