'use client'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Image from 'next/image'
import { ArrowRight, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'

interface ProducerCtaProps {
  onTabClick?: (id: string) => void
  onOpenModal?: () => void
}

export function ProducerCta({ onTabClick, onOpenModal }: ProducerCtaProps) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-8 lg:px-12 py-2 sm:py-3.5 pointer-events-none transition-all duration-300 bg-transparent gpu-accelerated',
        scrolled &&
          (isLight
            ? 'bg-[#FAF8F3]/90 backdrop-blur-[12px] border-b border-[rgba(184,132,47,0.12)] shadow-sm'
            : 'bg-[#060807]/90 backdrop-blur-[12px] border-b border-white/10 shadow-md'),
      )}
    >
      {/* Brand Logo Container: Responsive static logo and text */}
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 select-none shrink-0 min-w-0">
        <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
          <img
            src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
            alt="Şehitkamil Strateji Logo"
            className="w-full h-full object-contain drop-shadow"
            loading="eager"
            decoding="sync"
          />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap min-w-0">
          <span
            className={cn(
              'text-[12px] xs:text-[14px] sm:text-[17px] md:text-[19px] font-sans font-extrabold tracking-[0.12em] sm:tracking-[0.2em] uppercase leading-none transition-colors duration-300',
              isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E] drop-shadow-[0_0_14px_rgba(107,158,94,0.6)]',
            )}
          >
            ŞEHİTKAMİL
          </span>

          <span className={cn('hidden md:inline font-extrabold text-xs sm:text-base opacity-90 transition-colors duration-300', isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]')}>•</span>

          <span
            className={cn(
              'hidden md:inline text-[11px] sm:text-[14px] md:text-[15.5px] font-sans font-bold tracking-[0.22em] uppercase leading-none transition-colors duration-300',
              isLight ? 'text-[#1E1E1E]' : 'text-[#F5F3EC]',
            )}
          >
            STRATEJİ MERKEZİ
          </span>
        </div>
      </div>

      {/* Right Controls: Theme Switcher, Application Button & Login Button */}
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Karanlık/Açık Tema Değiştir"
          className={cn(
            'grid place-items-center w-7 h-7 sm:w-9 sm:h-9 rounded-full border backdrop-blur-[12px] transition-all duration-200 hover:scale-[1.05] active:scale-[0.98] shadow-sm text-xs font-medium',
            isLight
              ? 'border-gray-300 bg-white/90 text-gray-700 hover:border-[#3D6436] hover:text-[#3D6436]'
              : 'border-white/20 bg-black/70 text-white hover:border-[#6B9E5E] hover:text-[#6B9E5E]',
          )}
        >
          {isLight ? (
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-700" />
          ) : (
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6B9E5E]" />
          )}
        </button>

        {/* BAŞVURU YAP Button */}
        <button
          type="button"
          onClick={() => {
            if (onOpenModal) onOpenModal()
            else {
              const el = document.getElementById('sosyal-uretim') || document.getElementById('footer')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }
          }}
          className={cn(
            'hidden xs:inline-flex items-center gap-1.5 rounded-full border px-2.5 sm:px-4 py-1 sm:py-2 text-[9.5px] sm:text-[11.5px] font-sans font-bold tracking-[0.1em] backdrop-blur-[12px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm whitespace-nowrap cursor-pointer',
            isLight
              ? 'border-gray-300 bg-white/90 text-gray-800 hover:border-[#3D6436] hover:text-[#3D6436]'
              : 'border-white/25 bg-black/70 text-white hover:border-[#6B9E5E]',
          )}
        >
          <span>BAŞVURU YAP</span>
        </button>

        {/* GİRİŞ YAP Button */}
        <button
          type="button"
          onClick={() => {
            navigate('/login')
          }}
          className={cn(
            'group inline-flex items-center gap-1 sm:gap-2 rounded-full px-3 sm:px-5 py-1 sm:py-2 text-[10px] sm:text-[11.5px] font-sans font-bold tracking-[0.1em] sm:tracking-[0.12em] text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md whitespace-nowrap cursor-pointer',
            isLight
              ? 'bg-[#3D6436] hover:bg-[#2E4C29]'
              : 'bg-[#588B4B] hover:bg-[#46703B]',
          )}
        >
          <span>GİRİŞ YAP</span>
          <ArrowRight
            className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-180 group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </button>
      </div>
    </header>
  )
}
