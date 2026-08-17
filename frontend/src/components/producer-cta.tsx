'use client'

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Image from 'next/image'
import gsap from 'gsap'
import { ArrowRight, Sun, Moon, Volume2, VolumeX } from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'

interface ProducerCtaProps {
  onTabClick?: (id: string) => void
  onOpenModal?: () => void
}

export function ProducerCta({ onTabClick, onOpenModal }: ProducerCtaProps) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const tractorRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dustRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Tractor Drives Across & Reveals Text (Text stays PERMANENTLY visible!)
  useEffect(() => {
    const container = containerRef.current
    const tractor = tractorRef.current
    const textContainer = textRef.current
    const track = trackRef.current
    const dust = dustRef.current
    if (!container || !tractor || !textContainer || !track) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      gsap.set(textContainer, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 })
      gsap.set(track, { width: '100%', opacity: 0.8 })
      gsap.set(tractor, { display: 'none' })
      return
    }

    const wheels = tractor.querySelectorAll('.wheel')
    const particles = dust?.querySelectorAll('.dust-particle')

    // Continuous Wheel Rotation
    const wheelAnimation = gsap.to(wheels, {
      rotate: 1440,
      duration: 3.5,
      repeat: -1,
      ease: 'none',
      transformOrigin: '50% 50%',
    })

    // Reset function for tractor drive loops
    const resetTractor = () => {
      gsap.set(tractor, { left: '0%', xPercent: -100, opacity: 1 })
    }

    resetTractor()

    // Master Drive & Reveal Timeline
    const masterTl = gsap.timeline({
      repeat: -1,
      repeatDelay: 2.5,
      onRepeat: resetTractor,
      defaults: { ease: 'none' },
    })

    // Dust particles animation
    if (particles) {
      masterTl.to(
        particles,
        {
          opacity: 0.9,
          y: -6,
          x: -12,
          stagger: { each: 0.15, repeat: -1, yoyo: true },
          duration: 0.35,
        },
        0,
      )
    }

    // 1. Tractor Drives from 0% to 100% width across header
    masterTl.fromTo(
      tractor,
      { left: '0%', xPercent: -100, opacity: 1 },
      { left: '100%', xPercent: 20, opacity: 1, duration: 3.6 },
      0,
    )

    // 2. Text Clip-Path reveals strictly behind tractor (Reveals once & STAYS FULLY VISIBLE!)
    masterTl.fromTo(
      textContainer,
      { clipPath: 'inset(0% 100% 0% 0%)', opacity: 1 },
      { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 3.4 },
      0.1,
    )

    // 3. Soil Track expanding
    masterTl.fromTo(
      track,
      { width: '0%', opacity: 0.8 },
      { width: '100%', opacity: 0.8, duration: 3.4 },
      0.1,
    )

    // 4. Smooth fade out of tractor ONLY (Text and Track STAY 100% VISIBLE!)
    masterTl.to(
      tractor,
      {
        opacity: 0,
        duration: 0.5,
        ease: 'power1.out',
      },
      3.6,
    )

    return () => {
      wheelAnimation.kill()
      masterTl.kill()
    }
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
      {/* Brand Logo Container: Compact logo on mobile, Animated tractor reveal on desktop */}
      <div
        ref={containerRef}
        className="pointer-events-auto relative flex items-center h-9 sm:h-10 overflow-hidden shrink-0"
      >
        {/* Mobile Static Logo (Visible below sm breakpoint) */}
        <div className="flex sm:hidden items-center gap-2 select-none">
          <div className="relative w-6 h-6 shrink-0">
            <Image
              src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
              alt="Şehitkamil Strateji Logo"
              width={24}
              height={24}
              className="w-full h-full object-contain"
            />
          </div>
          <span
            className={cn(
              'text-[11px] font-sans font-extrabold tracking-[0.16em] uppercase leading-none transition-colors duration-300 whitespace-nowrap',
              isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]',
            )}
          >
            ŞEHİTKAMİL TARIM
          </span>
        </div>

        {/* Desktop Animated Logo & Track (Visible on sm and above) */}
        <div className="hidden sm:flex items-center gap-3.5 relative w-full h-full">
          {/* Layer 1: Tractor Track Dashed Line */}
          <div
            ref={trackRef}
            className={cn(
              'absolute bottom-1 left-0 h-[2px] border-b-2 border-dashed transition-opacity duration-300',
              isLight ? 'border-[#3D6436]' : 'border-[#6B9E5E]',
            )}
          />

          {/* Layer 2: Revealed Corporate Text */}
          <div
            ref={textRef}
            className="relative z-10 flex items-center gap-2.5 select-none w-full whitespace-nowrap"
            style={{ clipPath: 'inset(0% 100% 0% 0%)' }}
          >
            <div className="relative w-7 h-7 shrink-0">
              <Image
                src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
                alt="Şehitkamil Strateji Logo"
                width={28}
                height={28}
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
            <span
              className={cn(
                'text-[15px] sm:text-[17px] md:text-[19px] font-sans font-extrabold tracking-[0.25em] uppercase leading-none transition-colors duration-300',
                isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E] drop-shadow-[0_0_14px_rgba(107,158,94,0.6)]',
              )}
            >
              ŞEHİTKAMİL
            </span>

            <span className={cn('font-extrabold text-base opacity-90 transition-colors duration-300', isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]')}>•</span>

            <span
              className={cn(
                'text-[12.5px] sm:text-[14px] md:text-[15.5px] font-sans font-bold tracking-[0.28em] uppercase leading-none transition-colors duration-300',
                isLight ? 'text-[#1E1E1E]' : 'text-[#F5F3EC]',
              )}
            >
              STRATEJİ MERKEZİ
            </span>
          </div>

          {/* Layer 3: Dust Particles Layer */}
          <div ref={dustRef} className="pointer-events-none absolute bottom-2 left-0 z-20 flex gap-2">
            <div className={cn('dust-particle w-2 h-2 rounded-full blur-[0.5px] opacity-0', isLight ? 'bg-[#3D6436]/50' : 'bg-[#6B9E5E]/50')} />
            <div className={cn('dust-particle w-2.5 h-2.5 rounded-full blur-[1px] opacity-0', isLight ? 'bg-[#3D6436]/40' : 'bg-[#6B9E5E]/40')} />
            <div className={cn('dust-particle w-1.5 h-1.5 rounded-full blur-[0.5px] opacity-0', isLight ? 'bg-[#3D6436]/60' : 'bg-[#6B9E5E]/60')} />
          </div>

          {/* Layer 4: Vector SVG Tractor */}
          <div
            ref={tractorRef}
            className="pointer-events-none absolute bottom-1 left-0 z-30 flex items-center justify-center will-change-transform scale-100 md:scale-110 drop-shadow-[0_0_16px_rgba(107,158,94,0.7)]"
          >
            <svg viewBox="0 0 84 50" className={cn('w-16 h-10 transition-colors duration-300', isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]')}>
              <path
                d="M70 24L84 18V30L70 24Z"
                fill="url(#headlight-glow)"
                fillOpacity="0.85"
              />
              <defs>
                <linearGradient id="headlight-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFF" stopOpacity="0.9" />
                  <stop offset="100%" stopColor={isLight ? '#3D6436' : '#6B9E5E'} stopOpacity="0" />
                </linearGradient>
              </defs>

              <path
                d="M14 28H44V16L34 8H20L14 16V28Z"
                fill={isLight ? '#FFFFFF' : '#121712'}
                stroke={isLight ? '#3D6436' : '#6B9E5E'}
                strokeWidth="2"
              />

              <path
                d="M44 20H70V28H44V20Z"
                fill={isLight ? '#3D6436' : '#6B9E5E'}
                stroke="#FFF"
                strokeWidth="1.5"
              />

              <path d="M60 20V8H64V20" stroke="#FFF" strokeWidth="2" fill={isLight ? '#3D6436' : '#6B9E5E'} />

              <path d="M20 16H34V10H20V16Z" fill={isLight ? '#3D6436' : '#6B9E5E'} fillOpacity="0.4" stroke={isLight ? '#3D6436' : '#6B9E5E'} strokeWidth="1" />

              <g className="wheel wheel-rear" style={{ transformOrigin: '26px 35px' }}>
                <circle cx="26" cy="35" r="11" fill={isLight ? '#F4F1EA' : '#0A0D0A'} stroke={isLight ? '#3D6436' : '#6B9E5E'} strokeWidth="2.5" />
                <circle cx="26" cy="35" r="7" fill="none" stroke={isLight ? '#3D6436' : '#6B9E5E'} strokeWidth="1.5" />
                <line x1="26" y1="24" x2="26" y2="46" stroke={isLight ? '#3D6436' : '#6B9E5E'} strokeWidth="2" />
                <line x1="15" y1="35" x2="37" y2="35" stroke={isLight ? '#3D6436' : '#6B9E5E'} strokeWidth="2" />
                <circle cx="26" cy="35" r="3.5" fill="#FFF" />
              </g>

              <g className="wheel wheel-front" style={{ transformOrigin: '63px 37px' }}>
                <circle cx="63" cy="37" r="7" fill={isLight ? '#F4F1EA' : '#0A0D0A'} stroke={isLight ? '#3D6436' : '#6B9E5E'} strokeWidth="2.5" />
                <line x1="63" y1="30" x2="63" y2="44" stroke={isLight ? '#3D6436' : '#6B9E5E'} strokeWidth="1.8" />
                <line x1="56" y1="37" x2="70" y2="37" stroke={isLight ? '#3D6436' : '#6B9E5E'} strokeWidth="1.8" />
                <circle cx="63" cy="37" r="2.5" fill="#FFF" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Right Controls: Theme Switcher, Application Button & Login Button matching mockup */}
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 shrink-0">

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Karanlık/Açık Tema Değiştir"
          className={cn(
            'grid place-items-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border backdrop-blur-[12px] transition-all duration-200 hover:scale-[1.05] active:scale-[0.98] shadow-sm text-xs font-medium',
            isLight
              ? 'border-gray-300 bg-white/90 text-gray-700 hover:border-[#3D6436] hover:text-[#3D6436]'
              : 'border-white/20 bg-black/70 text-white hover:border-[#6B9E5E] hover:text-[#6B9E5E]',
          )}
        >
          {isLight ? (
            <Moon className="w-4 h-4 text-gray-700" />
          ) : (
            <Sun className="w-4 h-4 text-[#6B9E5E]" />
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
            'inline-flex items-center gap-1.5 rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-[11.5px] font-sans font-bold tracking-[0.12em] backdrop-blur-[12px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm whitespace-nowrap cursor-pointer',
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
            'group inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3.5 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-[11.5px] font-sans font-bold tracking-[0.12em] text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md whitespace-nowrap cursor-pointer',
            isLight
              ? 'bg-[#3D6436] hover:bg-[#2E4C29]'
              : 'bg-[#588B4B] hover:bg-[#46703B]',
          )}
        >
          <span>GİRİŞ YAP</span>
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-180 group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </button>
      </div>
    </header>
  )
}
