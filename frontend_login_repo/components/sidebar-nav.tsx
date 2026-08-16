'use client'

import React, { memo } from 'react'
import {
  Sprout,
  Users,
  Wheat,
  Flower2,
  Dna,
  Hexagon,
  Factory,
  Store,
} from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'
import { soundManager } from '@/lib/sound'

export const TIMELINE_ITEMS = [
  { id: 'baslangic', index: 1, number: '01', label: 'Başlangıç', icon: Sprout },
  { id: 'sosyal-uretim', index: 2, number: '02', label: 'Sosyal Üretim', icon: Users },
  { id: 'tahil-uretimi', index: 3, number: '03', label: 'Tahıl Üretimi', icon: Wheat },
  { id: 'aromatik-bitkiler', index: 4, number: '04', label: 'Aromatik Bitkiler', icon: Flower2 },
  { id: 'bitki-klonlama', index: 5, number: '05', label: 'Bitki Klonlama', icon: Dna },
  { id: 'aricilik-bal', index: 6, number: '06', label: 'Arıcılık & Bal', icon: Hexagon },
  { id: 'katma-deger', index: 7, number: '07', label: 'Katma Değer', icon: Factory },
  { id: 'sekabel', index: 8, number: '08', label: 'Şekabel', icon: Store },
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
      {/* DESKTOP SIDEBAR: Fixed vertical timeline */}
      <aside className="hidden lg:flex fixed lg:left-6 xl:left-8 top-20 bottom-16 lg:bottom-20 z-50 flex-col justify-between py-2 pointer-events-none gpu-accelerated transition-opacity duration-300">
        {/* Vertical Stepper Timeline */}
        <div className="pointer-events-auto my-auto relative flex flex-col gap-4 pl-2">
          {/* Rail connector line */}
          <div
            className={cn(
              'absolute left-[19px] top-3 bottom-3 w-[1px] -z-10 transition-colors duration-300',
              isLight ? 'bg-[#3D6436]/20' : 'bg-white/15',
            )}
          />

          {TIMELINE_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeIndex === item.index

            return (
              <div
                key={item.id}
                onClick={() => {
                  soundManager.playTransition()
                  onNavigate(item.id)
                }}
                className="flex items-center gap-3 cursor-pointer group py-1"
              >
                {/* Number / Icon Badge */}
                <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                  {isActive ? (
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 scale-110 shadow-md relative z-10 font-mono text-xs font-bold',
                        isLight
                          ? 'bg-[#3D6436] text-white shadow-[0_4px_16px_rgba(61,100,54,0.3)]'
                          : 'bg-[#588B4B] text-white shadow-[0_0_18px_rgba(88,139,75,0.4)]',
                      )}
                    >
                      <span className="text-[11px] font-bold">{item.number}</span>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border font-mono text-[10px] font-bold',
                        isLight
                          ? 'border-gray-300 bg-white/80 text-gray-600 group-hover:border-[#3D6436] group-hover:text-[#3D6436]'
                          : 'border-white/20 bg-black/60 text-slate-400 group-hover:border-[#6B9E5E] group-hover:text-[#6B9E5E]',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="flex items-center gap-2 text-left overflow-hidden">
                  <span
                    className={cn(
                      'text-xs font-sans transition-all duration-300 truncate',
                      isActive
                        ? isLight
                          ? 'text-[#3D6436] font-extrabold'
                          : 'text-[#6B9E5E] font-extrabold'
                        : isLight
                        ? 'text-gray-600 font-medium group-hover:text-gray-900'
                        : 'text-slate-400 font-medium group-hover:text-slate-200',
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mouse Scroll Indicator Button (Restored classic pill button style) */}
        <div className="pointer-events-auto flex flex-col items-start gap-2 pt-2 pl-2">
          <div
            className={cn(
              'w-6 h-10 rounded-full border flex items-center justify-center p-1 backdrop-blur-[12px] transition-colors duration-300 shadow-sm',
              isLight
                ? 'border-[#3D6436]/20 bg-white'
                : 'border-white/25 bg-black/40',
            )}
          >
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full animate-scroll-dot transition-colors duration-300',
                isLight ? 'bg-[#3D6436]' : 'bg-[#6B9E5E] shadow-[0_0_8px_#6B9E5E]',
              )}
            />
          </div>
        </div>
      </aside>

      {/* MOBILE NAVIGATION BAR */}
      <div className="flex lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50 pointer-events-auto items-center justify-between gap-2 p-1.5 rounded-full border backdrop-blur-xl shadow-2xl transition-all duration-300 bg-black/90 border-[#6B9E5E]/40 text-white">
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Önceki Bölüm"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-white/15 active:scale-95 transition-all text-[#6B9E5E] bg-white/5 hover:bg-white/10"
        >
          <span className="font-mono text-base font-bold">‹</span>
        </button>

        <div className="flex items-center gap-2 px-2 py-1 overflow-hidden">
          <span className="font-mono text-xs font-extrabold text-[#6B9E5E] tracking-wider shrink-0">
            {currentItem.number} / 08
          </span>
          <span className="w-1 h-1 rounded-full bg-[#6B9E5E] shrink-0" />
          <span className="text-[11px] font-sans font-extrabold tracking-wider uppercase truncate text-slate-100">
            {currentItem.label}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Sonraki Bölüm"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-white/15 active:scale-95 transition-all text-[#6B9E5E] bg-white/5 hover:bg-white/10"
        >
          <span className="font-mono text-base font-bold">›</span>
        </button>
      </div>
    </>
  )
}

export const SidebarNav = memo(SidebarNavComponent)
