'use client'

import React, { useEffect, useRef, memo } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Satellite,
  BrainCircuit,
  Smartphone,
  UserCheck,
  Activity,
  Sprout,
  Leaf,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Hexagon,
} from 'lucide-react'
import type { Chapter } from '@/lib/chapters'
import { SceneFx } from '@/components/scene-fx'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'
import { SECTION_ART_DIRECTION } from '@/lib/motion'
import { soundManager } from '@/lib/sound'

gsap.registerPlugin(ScrollTrigger)

const CARD_ICON: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  sprout: Sprout,
  user: UserCheck,
  phone: Smartphone,
  shield: ShieldCheck,
  leaf: Leaf,
  chart: TrendingUp,
  sparkles: Sparkles,
  brain: BrainCircuit,
  hexagon: Hexagon,
}

interface ChapterStageProps {
  chapter: Chapter
  activeIndex?: number
  onActive: (index: number) => void
  onOpenModal?: () => void
}

const ACCENT_STYLES = {
  green: {
    eyebrowLight: 'text-[#3D6436]',
    eyebrowDark: 'text-[#6B9E5E] drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]',
    titleSegLight: 'text-[#3D6436] font-black',
    titleSegDark: 'text-[#6B9E5E] font-black',
    barLight: 'bg-[#3D6436]',
    barDark: 'bg-[#6B9E5E]',
    primaryCtaLight: 'bg-[#3D6436] hover:bg-[#2E4C29]',
    primaryCtaDark: 'bg-[#588B4B] hover:bg-[#46703B]',
    secondaryCtaLight: 'text-[#3D6436] hover:text-[#2E4C29]',
    secondaryCtaDark: 'text-[#6B9E5E] hover:text-white',
    cardIconLight: 'bg-[#3D6436]/10 text-[#3D6436]',
    cardIconDark: 'bg-[#588B4B]/20 text-[#6B9E5E]',
  },
  lavender: {
    eyebrowLight: 'text-[#7E22CE]',
    eyebrowDark: 'text-[#C084FC] drop-shadow-[0_1px_8px_rgba(168,85,247,0.5)]',
    titleSegLight: 'text-[#7E22CE] font-black',
    titleSegDark: 'text-[#C084FC] font-black',
    barLight: 'bg-[#7E22CE]',
    barDark: 'bg-[#A855F7] shadow-[0_0_12px_rgba(168,85,247,0.6)]',
    primaryCtaLight: 'bg-[#7E22CE] hover:bg-[#6B21A8]',
    primaryCtaDark: 'bg-[#9333EA] hover:bg-[#7E22CE] shadow-[0_0_18px_rgba(147,51,234,0.4)]',
    secondaryCtaLight: 'text-[#7E22CE] hover:text-[#6B21A8]',
    secondaryCtaDark: 'text-[#C084FC] hover:text-white',
    cardIconLight: 'bg-[#7E22CE]/10 text-[#7E22CE]',
    cardIconDark: 'bg-[#9333EA]/20 text-[#C084FC]',
  },
  amber: {
    eyebrowLight: 'text-[#B45309]',
    eyebrowDark: 'text-[#FBBF24] drop-shadow-[0_1px_8px_rgba(245,158,11,0.5)]',
    titleSegLight: 'text-[#B45309] font-black',
    titleSegDark: 'text-[#FBBF24] font-black',
    barLight: 'bg-[#B45309]',
    barDark: 'bg-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.6)]',
    primaryCtaLight: 'bg-[#B45309] hover:bg-[#78350F]',
    primaryCtaDark: 'bg-[#D97706] hover:bg-[#B45309] shadow-[0_0_18px_rgba(217,119,6,0.4)]',
    secondaryCtaLight: 'text-[#B45309] hover:text-[#78350F]',
    secondaryCtaDark: 'text-[#FBBF24] hover:text-white',
    cardIconLight: 'bg-[#B45309]/10 text-[#B45309]',
    cardIconDark: 'bg-[#D97706]/20 text-[#FBBF24]',
  },
  cyan: {
    eyebrowLight: 'text-[#0369A1]',
    eyebrowDark: 'text-[#38BDF8] drop-shadow-[0_1px_8px_rgba(56,189,248,0.5)]',
    titleSegLight: 'text-[#0369A1] font-black',
    titleSegDark: 'text-[#38BDF8] font-black',
    barLight: 'bg-[#0369A1]',
    barDark: 'bg-[#0EA5E9] shadow-[0_0_12px_rgba(14,165,233,0.6)]',
    primaryCtaLight: 'bg-[#0369A1] hover:bg-[#075985]',
    primaryCtaDark: 'bg-[#0284C7] hover:bg-[#0369A1] shadow-[0_0_18px_rgba(2,132,199,0.4)]',
    secondaryCtaLight: 'text-[#0369A1] hover:text-[#075985]',
    secondaryCtaDark: 'text-[#38BDF8] hover:text-white',
    cardIconLight: 'bg-[#0369A1]/10 text-[#0369A1]',
    cardIconDark: 'bg-[#0284C7]/20 text-[#38BDF8]',
  },
}

function ChapterStageComponent({
  chapter,
  activeIndex,
  onActive,
  onOpenModal,
}: ChapterStageProps) {
  const rootRef = useRef<HTMLElement>(null)
  const imageLayerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  // Native IntersectionObserver for 100% reliable active section tracking
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            onActive(chapter.index)
          }
        })
      },
      {
        threshold: [0.35, 0.6],
      },
    )

    observer.observe(root)
    return () => observer.disconnect()
  }, [chapter.index, onActive])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      const far = root.querySelector('.layer-far')
      const reveals = root.querySelectorAll('.reveal')

      if (!reduce) {
        if (far) {
          gsap.fromTo(
            far,
            { yPercent: -3, scale: 1.02 },
            {
              yPercent: 3,
              scale: 1.05,
              ease: 'none',
              scrollTrigger: {
                trigger: root,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.5,
              },
            },
          )
        }

        if (reveals.length > 0) {
          gsap.fromTo(
            reveals,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              stagger: 0.05,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: root,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
              },
            },
          )
        }
      }

      ScrollTrigger.create({
        trigger: root,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: (self: any) => {
          if (self.isActive) {
            onActive(chapter.index)
            soundManager.playTransition()
          }
        },
      })
    }, root)

    return () => ctx.revert()
  }, [chapter.index, onActive])

  const isLight = theme === 'light'
  const isFirstChapter = chapter.index === 1
  const imageSrc = chapter.image || `/chapters/${chapter.index}.webp`
  const artDir = SECTION_ART_DIRECTION[chapter.id] || { className: 'object-right' }

  const style = ACCENT_STYLES[chapter.accent] || ACCENT_STYLES.green

  return (
    <section
      ref={rootRef}
      id={chapter.id}
      data-chapter={chapter.index}
      className={cn(
        'relative min-h-screen w-full overflow-hidden gpu-accelerated flex items-center',
        isLight ? 'bg-[#F8F7F2]' : 'bg-[#060807]',
      )}
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <div
          ref={imageLayerRef}
          className="layer-far absolute inset-0 will-change-transform transition-opacity duration-300"
        >
          <Image
            src={imageSrc}
            alt=""
            aria-hidden="true"
            fill
            priority={isFirstChapter}
            loading={isFirstChapter ? 'eager' : 'lazy'}
            sizes="100vw"
            className={cn(
              'object-cover select-none opacity-100 transition-all duration-300',
              isLight ? 'contrast-100 brightness-100' : 'contrast-105 brightness-105',
              artDir.className,
            )}
            draggable={false}
          />
        </div>

        {/* Original Soft Ambient Fade Overlay for 100% text readability */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-10 transition-colors duration-300',
            isLight
              ? 'bg-[linear-gradient(180deg,rgba(248,247,242,0.50)_0%,rgba(248,247,242,0.92)_100%)] lg:bg-[linear-gradient(90deg,#F8F7F2_0%,#F8F7F2_38%,rgba(248,247,242,0.78)_52%,transparent_78%)]'
              : 'bg-[linear-gradient(180deg,rgba(6,8,7,0.50)_0%,rgba(6,8,7,0.92)_100%)] lg:bg-[linear-gradient(90deg,#060807_0%,#060807_38%,rgba(6,8,7,0.78)_52%,transparent_78%)]',
          )}
        />

        {/* Scene FX */}
        <SceneFx scene={chapter.scene} />
        {/* Main Content & Bottom Bar Container */}
        <div className="relative z-30 flex flex-col justify-between h-full w-full pl-5 sm:pl-8 md:pl-36 lg:pl-60 xl:pl-64 pr-5 sm:pr-8 pt-16 sm:pt-20 lg:pt-16 pb-24 sm:pb-28 lg:pb-16 overflow-hidden">
          {/* Upper / Center Column: Typography & CTAs */}
          <div
            className={cn(
              'w-full max-w-[540px] lg:max-w-[580px] my-auto transition-all duration-300',
            )}
          >
            {/* Eyebrow */}
            <div className="reveal mb-2 flex items-center gap-2.5">
              <span
                className={cn(
                  'text-[12px] sm:text-[13px] font-sans font-bold uppercase tracking-[0.2em] transition-colors duration-300',
                  isLight ? style.eyebrowLight : style.eyebrowDark,
                )}
              >
                {chapter.eyebrow}
              </span>
            </div>

            {/* Headline */}
            <h2
              className={cn(
                'reveal text-balance text-[25px] xs:text-[28px] sm:text-3xl md:text-4xl lg:text-[2.5rem] xl:text-[2.85rem] font-sans font-black leading-[1.15] tracking-[-0.025em] transition-colors duration-300',
                isLight ? 'text-[#1E1E1E]' : 'text-[#F5F3EC]',
              )}
            >
              {chapter.title.map((line, li) => (
                <span key={li} className="block">
                  {line.map((seg, si) => (
                    <span
                      key={si}
                      className={cn(
                        seg.accent && (isLight ? style.titleSegLight : style.titleSegDark),
                      )}
                    >
                      {seg.text}
                    </span>
                  ))}
                </span>
              ))}
            </h2>

            {/* Accent underline bar */}
            <div
              className={cn(
                'reveal mt-3 h-1 w-12 rounded-full transition-colors duration-300',
                isLight ? style.barLight : style.barDark,
              )}
            />

            {/* Description Paragraph */}
            {chapter.description && (
              <p
                className={cn(
                  'reveal mt-3.5 max-w-[520px] text-[13.5px] xs:text-[14.5px] sm:text-[15px] lg:text-[15.5px] font-medium leading-[1.65] transition-colors duration-300',
                  isLight ? 'text-gray-800' : 'text-slate-200',
                )}
              >
                {chapter.description}
              </p>
            )}

            {/* Action Buttons matching mockup */}
            <div className="reveal mt-4 sm:mt-5 flex flex-wrap items-center gap-3.5">
              {/* Primary Pill Button */}
              {chapter.primaryCta && (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenModal) onOpenModal()
                  }}
                  className={cn(
                    'group inline-flex items-center gap-2.5 rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-[11.5px] sm:text-xs font-bold tracking-[0.14em] text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer',
                    isLight ? style.primaryCtaLight : style.primaryCtaDark,
                  )}
                >
                  <span>{chapter.primaryCta.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-180 group-hover:translate-x-0.5" strokeWidth={2} />
                </button>
              )}

              {/* Secondary Link Button */}
              {chapter.secondaryCta && (
                <button
                  type="button"
                  onClick={() => {
                    const nextEl = document.getElementById('sosyal-uretim') || document.getElementById('footer')
                    if (nextEl) nextEl.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className={cn(
                    'group inline-flex items-center gap-1.5 text-[12.5px] sm:text-[13.5px] font-bold transition-colors duration-200 cursor-pointer underline-offset-4 hover:underline',
                    isLight ? style.secondaryCtaLight : style.secondaryCtaDark,
                  )}
                >
                  <span>{chapter.secondaryCta.label}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Floating 4-Card Bar matching mockup */}
          {chapter.bottomCards && (
            <div className="reveal mt-auto pt-2 sm:pt-3 w-full">
              <div
                className={cn(
                  'w-full max-w-5xl rounded-2xl p-3 sm:p-4.5 backdrop-blur-xl border shadow-xl transition-all duration-300 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5',
                  isLight
                    ? 'bg-white/95 border-gray-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
                    : 'bg-[#0A0D0A]/90 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)]',
                )}
              >
                {chapter.bottomCards.map((card, i) => {
                  const Icon = CARD_ICON[card.icon] || Sprout
                  return (
                    <div key={i} className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3.5 group">
                      <div
                        className={cn(
                          'grid h-8 w-8 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:scale-105',
                          isLight ? style.cardIconLight : style.cardIconDark,
                        )}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} />
                      </div>
                      <div className="pt-0.5">
                        <h4
                          className={cn(
                            'text-[12px] sm:text-[13.5px] font-bold leading-tight transition-colors duration-200',
                            isLight ? 'text-gray-900' : 'text-white',
                          )}
                        >
                          {card.title}
                        </h4>
                        <p
                          className={cn(
                            'mt-1 text-[11px] sm:text-[11.5px] leading-relaxed transition-colors duration-200',
                            isLight ? 'text-gray-700' : 'text-slate-300',
                          )}
                        >
                          {card.desc}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export const ChapterStage = memo(ChapterStageComponent)
