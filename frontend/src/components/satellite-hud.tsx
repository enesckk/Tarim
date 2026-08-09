'use client'

import React, { memo } from 'react'
import { Satellite, Radio, Cpu, Droplets, Sun, ShieldAlert } from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'

function SatelliteHudComponent() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div className="w-full mt-5 reveal space-y-2">
      <div className="flex items-center justify-between text-[10px] font-mono font-extrabold tracking-widest uppercase">
        <span className={cn('flex items-center gap-1.5', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')}>
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>CANLI TELEMETRİ & DRON VERİ AKIŞI</span>
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[9px] bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>SİSTEM AKTİF</span>
        </span>
      </div>

      <div
        className={cn(
          'p-4 rounded-2xl border backdrop-blur-md shadow-xl space-y-3 relative overflow-hidden',
          isLight
            ? 'bg-white/90 border-[#B8842F]/30 text-[#1E1E1E]'
            : 'bg-black/70 border-white/20 text-white',
        )}
      >
        {/* Top Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className={cn('p-2.5 rounded-xl border text-left', isLight ? 'bg-[#FAF8F3] border-[#B8842F]/20' : 'bg-white/5 border-white/10')}>
            <div className="flex items-center gap-1.5 text-[9px] font-mono opacity-70">
              <Satellite className="w-3 h-3 text-[#9E6F22] dark:text-[#D6AE5E]" />
              <span>NDVI BİTKİ ENDEKSİ</span>
            </div>
            <span className="block font-mono text-base font-extrabold text-emerald-500 pt-0.5">
              0.84 <span className="text-[10px] font-sans font-bold text-emerald-600">(Sağlıklı)</span>
            </span>
          </div>

          <div className={cn('p-2.5 rounded-xl border text-left', isLight ? 'bg-[#FAF8F3] border-[#B8842F]/20' : 'bg-white/5 border-white/10')}>
            <div className="flex items-center gap-1.5 text-[9px] font-mono opacity-70">
              <Droplets className="w-3 h-3 text-sky-400" />
              <span>TOPRAK NEMİ</span>
            </div>
            <span className="block font-mono text-base font-extrabold text-sky-400 pt-0.5">
              %42.5 <span className="text-[10px] font-sans font-bold text-sky-500">(İdeal)</span>
            </span>
          </div>

          <div className={cn('p-2.5 rounded-xl border text-left col-span-2 sm:col-span-1', isLight ? 'bg-[#FAF8F3] border-[#B8842F]/20' : 'bg-white/5 border-white/10')}>
            <div className="flex items-center gap-1.5 text-[9px] font-mono opacity-70">
              <Cpu className="w-3 h-3 text-[#9E6F22] dark:text-[#D6AE5E]" />
              <span>AI HASTALIK RİSKİ</span>
            </div>
            <span className="block font-mono text-base font-extrabold text-amber-400 pt-0.5">
              %0.2 <span className="text-[10px] font-sans font-bold text-emerald-400">(Sıfır Risk)</span>
            </span>
          </div>
        </div>

        {/* Status Line */}
        <div className="flex items-center justify-between text-[10.5px] font-mono pt-1 border-t border-current/10 opacity-80">
          <span>PARSEL: 37°04&apos;N 37°22&apos;E (AGROPARK KAMPÜS)</span>
          <span className="font-bold text-[#9E6F22] dark:text-[#D6AE5E]">DRON #04 DEVREDE</span>
        </div>
      </div>
    </div>
  )
}

export const SatelliteHud = memo(SatelliteHudComponent)
