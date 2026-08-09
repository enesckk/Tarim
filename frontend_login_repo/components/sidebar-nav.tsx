'use client'

import React, { useState, useEffect, memo } from 'react'
import {
  Sprout,
  Activity,
  Eye,
  Smartphone,
  GraduationCap,
  Tractor,
  Handshake,
  ShoppingCart,
} from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'

export const TIMELINE_ITEMS = [
  { id: 'baslangic', index: 1, number: '01', label: 'BAŞLANGIÇ', icon: Sprout },
  { id: 'analiz', index: 2, number: '02', label: 'ANALİZ', icon: Activity },
  { id: 'vizyon', index: 3, number: '03', label: 'VİZYON', icon: Eye },
  { id: 'dijital-takip', index: 4, number: '04', label: 'DİJİTAL TAKİP', icon: Smartphone },
  { id: 'egitim', index: 5, number: '05', label: 'EĞİTİM', icon: GraduationCap },
  { id: 'uretim', index: 6, number: '06', label: 'ÜRETİM', icon: Tractor },
  { id: 'hasat', index: 7, number: '07', label: 'GARANTİLİ ALIM', icon: Handshake },
  { id: 'pazara', index: 8, number: '08', label: 'PAZARA', icon: ShoppingCart },
]

interface SidebarNavProps {
  activeIndex: number
  onNavigate: (id: string) => void
  progress: number
}

function SidebarNavComponent({
  activeIndex,
  onNavigate,
}: SidebarNavProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const currentItem = TIMELINE_ITEMS.find((item) => item.index === activeIndex) || TIMELINE_ITEMS[0]

  const handlePrev = () => {
    const prevIdx = activeIndex > 1 ? activeIndex - 1 : TIMELINE_ITEMS.length
    const prevItem = TIMELINE_ITEMS.find((it) => it.index === prevIdx)
    if (prevItem) onNavigate(prevItem.id)
  }

  const handleNext = () => {
    const nextIdx = activeIndex < TIMELINE_ITEMS.length ? activeIndex + 1 : 1
    const nextItem = TIMELINE_ITEMS.find((it) => it.index === nextIdx)
    if (nextItem) onNavigate(nextItem.id)
  }

  return (
    <>
      {/* DESKTOP SIDEBAR: Fixed vertical timeline on left (Hidden on mobile & hidden in footer) */}
      <aside className="hidden lg:flex fixed lg:left-8 xl:left-10 top-0 bottom-0 z-50 flex-col justify-between py-12 pointer-events-none gpu-accelerated transition-opacity duration-300">
        {/* Vertical Stepper Timeline with Sleek Chapter Icons */}
        <div className="pointer-events-auto my-auto relative flex flex-col gap-5 pl-2">
          {/* Background vertical rail */}
          <div
            className={cn(
              'absolute left-[23px] top-3 bottom-3 w-[1px] -z-10 transition-colors duration-300',
              isLight ? 'bg-[#B8842F]/20' : 'bg-white/15',
            )}
          />

          {TIMELINE_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeIndex === item.index

            return (
              <div
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex items-center gap-3.5 cursor-pointer group"
              >
                {/* Icon Container Node with Pulsing Radar Ring & Glowing Gold Aura */}
                <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-0 rounded-full animate-ping opacity-30',
                        isLight ? 'bg-[#B8842F]' : 'bg-[#D6AE5E]',
                      )}
                    />
                  )}

                  {isActive ? (
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 scale-110 shadow-lg relative z-10',
                        isLight
                          ? 'border-[#B8842F] bg-white text-[#B8842F] shadow-[0_4px_20px_rgba(184,132,47,0.35)]'
                          : 'border-[#D6AE5E] bg-black/90 text-[#D6AE5E] shadow-[0_0_22px_rgba(214,174,94,0.45)]',
                      )}
                    >
                      <Icon className="w-4.5 h-4.5 animate-pulse" strokeWidth={1.8} />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110',
                        isLight
                          ? 'text-[#4F4F4F] group-hover:text-[#B8842F] group-hover:bg-white/80'
                          : 'text-slate-400 group-hover:text-[#D6AE5E] group-hover:bg-white/10',
                      )}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                {/* Step Number and Label with Slide-in Fade Animation */}
                <div className="flex items-center gap-2 text-left overflow-hidden max-w-[200px]">
                  <span
                    className={cn(
                      'text-[9px] font-mono tracking-widest leading-none font-bold transition-colors duration-300 shrink-0',
                      isActive
                        ? isLight
                          ? 'text-[#B8842F]'
                          : 'text-[#D6AE5E]'
                        : isLight
                        ? 'text-[#4F4F4F] group-hover:text-[#1E1E1E]'
                        : 'text-slate-500 group-hover:text-slate-300',
                    )}
                  >
                    {item.number}
                  </span>

                  {isActive && (
                    <span
                      className={cn(
                        'text-[9.5px] font-sans font-bold tracking-[0.16em] leading-tight uppercase transition-all duration-300 truncate animate-in fade-in slide-in-from-left-2',
                        isLight ? 'text-[#B8842F]' : 'text-[#D6AE5E]',
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mouse Scroll Indicator at Bottom */}
        <div className="pointer-events-auto flex flex-col items-start gap-2 pt-2 pl-2">
          <div
            className={cn(
              'w-6 h-10 rounded-full border flex items-center justify-center p-1 backdrop-blur-[12px] transition-colors duration-300',
              isLight
                ? 'border-[rgba(184,132,47,0.2)] bg-white shadow-sm'
                : 'border-white/25 bg-black/40',
            )}
          >
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full animate-scroll-dot transition-colors duration-300',
                isLight ? 'bg-[#B8842F]' : 'bg-[#D6AE5E] shadow-[0_0_8px_#D6AE5E]',
              )}
            />
          </div>
        </div>
      </aside>

      {/* MOBILE NAVIGATION BAR: Centered Floating Frosted Glass Chapter Stepper Pill (Floats above fixed bottom bar) */}
      <div className="flex lg:hidden fixed bottom-[4.2rem] left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm z-50 pointer-events-auto items-center justify-between gap-2 p-1.5 rounded-full border backdrop-blur-xl shadow-2xl transition-all duration-300 bg-black/90 border-[#D6AE5E]/40 text-white">
        {/* Previous Chapter Button */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Önceki Bölüm"
          className="w-9 h-9 rounded-full flex items-center justify-center border border-white/15 active:scale-95 transition-all text-[#D6AE5E] bg-white/5 hover:bg-white/10"
        >
          <span className="font-mono text-base font-bold">‹</span>
        </button>

        {/* Current Active Chapter Pill Info */}
        <div className="flex items-center gap-2 px-2 py-1 overflow-hidden">
          <span className="font-mono text-xs font-extrabold text-[#D6AE5E] tracking-wider shrink-0">
            {currentItem.number} / 08
          </span>
          <span className="w-1 h-1 rounded-full bg-[#D6AE5E] shrink-0" />
          <span className="text-[11px] font-sans font-extrabold tracking-wider uppercase truncate text-slate-100">
            {currentItem.label}
          </span>
        </div>

        {/* Next Chapter Button */}
        <button
          type="button"
          onClick={handleNext}
          aria-label="Sonraki Bölüm"
          className="w-9 h-9 rounded-full flex items-center justify-center border border-white/15 active:scale-95 transition-all text-[#D6AE5E] bg-white/5 hover:bg-white/10"
        >
          <span className="font-mono text-base font-bold">›</span>
        </button>
      </div>
    </>
  )
}

export const SidebarNav = memo(SidebarNavComponent)

