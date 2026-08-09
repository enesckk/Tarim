'use client'

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Image from 'next/image'
import { ArrowRight, Sun, Moon, LogIn } from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'

interface ProducerCtaProps {
  onTabClick?: (id: string) => void
  onOpenModal?: () => void
}

export function ProducerCta({ onTabClick, onOpenModal }: ProducerCtaProps) {
  const [scrolled, setScrolled] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  // Safely check login state from storage
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('agriculture.auth')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.token && parsed?.user) {
          setIsLoggedIn(true)
        }
      }
    } catch {
      setIsLoggedIn(false)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])


  const [isMuted, setIsMuted] = useState(true)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const toggleAmbientAudio = () => {
    if (isMuted) {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          audioCtxRef.current = ctx

          const bufferSize = ctx.sampleRate * 2
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
          const output = buffer.getChannelData(0)
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1
            b0 = 0.99886 * b0 + white * 0.0555179
            b1 = 0.99332 * b1 + white * 0.0750759
            b2 = 0.96900 * b2 + white * 0.1538520
            b3 = 0.86650 * b3 + white * 0.3104856
            b4 = 0.55000 * b4 + white * 0.5329522
            b5 = -0.7616 * b5 - white * 0.0168980
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
            output[i] *= 0.012
            b6 = white * 0.115926
          }

          const noise = ctx.createBufferSource()
          noise.buffer = buffer
          noise.loop = true

          const filter = ctx.createBiquadFilter()
          filter.type = 'lowpass'
          filter.frequency.value = 350

          const gain = ctx.createGain()
          gain.gain.value = 0.12

          noise.connect(filter)
          filter.connect(gain)
          gain.connect(ctx.destination)
          noise.start()
        }
      } else if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
      setIsMuted(false)
    } else {
      if (audioCtxRef.current) {
        audioCtxRef.current.suspend()
      }
      setIsMuted(true)
    }
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-8 lg:px-12 py-2.5 sm:py-3.5 pointer-events-none transition-all duration-300 bg-transparent gpu-accelerated',
        scrolled &&
          (isLight
            ? 'bg-[#FAF8F3]/90 backdrop-blur-[12px] border-b border-[rgba(184,132,47,0.12)] shadow-sm'
            : 'bg-[#060807]/90 backdrop-blur-[12px] border-b border-white/10 shadow-md'),
      )}
    >
      {/* Brand Logo Container: Static logo on all screen sizes */}
      <div
        ref={containerRef}
        className="pointer-events-auto relative flex items-center h-9 sm:h-10 shrink-0"
      >
        {/* Mobile Static Logo (Visible below sm breakpoint) */}
        <div className="flex sm:hidden items-center gap-2 select-none">
          <div className="relative w-9 h-9 shrink-0">
            <Image
              src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
              alt="Şehitkamil Strateji Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain"
            />
          </div>
          <span
            className={cn(
              'text-[11px] font-sans font-extrabold tracking-[0.16em] uppercase leading-none transition-colors duration-300 whitespace-nowrap',
              isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]',
            )}
          >
            ŞEHİTKAMİL TARIM
          </span>
        </div>

        {/* Desktop Static Logo (Visible on sm and above) */}
        <div className="hidden sm:flex items-center gap-2.5 select-none whitespace-nowrap">
          <div className="relative w-10 h-10 shrink-0">
            <Image
              src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
              alt="Şehitkamil Strateji Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain drop-shadow"
            />
          </div>
          <span
            className={cn(
              'text-[15px] sm:text-[17px] md:text-[19px] font-sans font-extrabold tracking-[0.25em] uppercase leading-none transition-colors duration-300',
              isLight ? 'text-[#B8842F]' : 'text-[#D6AE5E] drop-shadow-[0_0_14px_rgba(214,174,94,0.6)]',
            )}
          >
            ŞEHİTKAMİL
          </span>

          <span className={cn('font-extrabold text-base opacity-90 transition-colors duration-300', isLight ? 'text-[#B8842F]' : 'text-[#D6AE5E]')}>•</span>

          <span
            className={cn(
              'text-[12.5px] sm:text-[14px] md:text-[15.5px] font-sans font-bold tracking-[0.28em] uppercase leading-none transition-colors duration-300',
              isLight ? 'text-[#1E1E1E]' : 'text-[#F5F3EC]',
            )}
          >
            STRATEJİ MERKEZİ
          </span>
        </div>
      </div>

      {/* Right Controls: Theme Switcher, BAŞVURU & GİRİŞ YAP / PANEL */}
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 shrink-0 z-50">

        {/* Tema Değiştir */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Karanlık/Açık Tema Değiştir"
          className={cn(
            'flex items-center gap-1 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-full border backdrop-blur-[12px] transition-button-180 hover:scale-[1.02] active:scale-[0.99] shadow-sm text-xs font-medium cursor-pointer',
            isLight
              ? 'border-[rgba(184,132,47,0.2)] bg-white/90 text-[#1E1E1E] hover:border-[#B8842F]'
              : 'border-white/20 bg-black/70 text-white hover:border-[#D6AE5E]',
          )}
        >
          {isLight ? (
            <>
              <Moon className="w-3 h-3 text-[#B8842F]" />
              <span className="text-[9px] font-mono tracking-wider font-semibold hidden xs:inline">KOYU</span>
            </>
          ) : (
            <>
              <Sun className="w-3 h-3 text-[#D6AE5E]" />
              <span className="text-[9px] font-mono tracking-wider font-semibold hidden xs:inline">AÇIK</span>
            </>
          )}
        </button>

        {/* Başvuru Butonu */}
        <button
          type="button"
          onClick={() => {
            if (onOpenModal) onOpenModal()
            else {
              const el = document.getElementById('basvuru') || document.getElementById('footer')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }
          }}
          className={cn(
            'group inline-flex items-center gap-1 sm:gap-2 rounded-full border px-2.5 sm:px-4 py-1 sm:py-1.5 text-[9.5px] sm:text-[11px] font-sans font-extrabold tracking-[0.1em] sm:tracking-[0.16em] backdrop-blur-[12px] transition-button-180 hover:scale-[1.02] active:scale-[0.99] shadow-sm whitespace-nowrap cursor-pointer',
            isLight
              ? 'border-[#B8842F] bg-white/90 text-[#B8842F] hover:bg-[#B8842F] hover:text-white'
              : 'border-[#D6AE5E]/40 bg-black/70 text-[#F5F3EC] hover:border-[#D6AE5E] hover:bg-[#D6AE5E] hover:text-black',
          )}
        >
          <span>BAŞVURU</span>
          <ArrowRight
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-180 group-hover:translate-x-1',
              isLight ? 'text-[#B8842F] group-hover:text-white' : 'text-[#D6AE5E] group-hover:text-black',
            )}
            strokeWidth={1.8}
          />
        </button>

        {/* Giriş Yap — en sağda */}
        <button
          type="button"
          onClick={() => {
            navigate('/login')
          }}
          className={cn(
            'group inline-flex items-center gap-1 sm:gap-1.5 rounded-full border px-2.5 sm:px-4 py-1 sm:py-1.5 text-[9.5px] sm:text-[11px] font-sans font-extrabold tracking-[0.1em] sm:tracking-[0.16em] backdrop-blur-[12px] transition-all duration-180 hover:scale-[1.02] active:scale-[0.99] shadow-sm whitespace-nowrap cursor-pointer',
            isLight
              ? 'border-[#1A6B3C] bg-[#1A6B3C] text-white hover:bg-[#145530]'
              : 'border-[#4ade80]/60 bg-[#166534]/80 text-[#4ade80] hover:bg-[#4ade80] hover:text-black',
          )}
        >
          <LogIn className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
          <span>GİRİŞ YAP</span>
        </button>
      </div>
    </header>
  )
}
