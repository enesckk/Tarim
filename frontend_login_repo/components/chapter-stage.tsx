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

function ChapterStageComponent({
  chapter,
  activeIndex,
  onActive,
  onOpenModal,
}: ChapterStageProps) {
  const rootRef = useRef<HTMLElement>(null)
  const imageLayerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

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
        onToggle: (self) => {
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
  const imageSrc = chapter.image || `/chapters/${chapter.index}.png`

  const artDir = SECTION_ART_DIRECTION[chapter.id] || { className: 'object-right' }

  return (
    <section
      ref={rootRef}
      id={chapter.id}
      data-chapter={chapter.index}
      className={cn(
        'relative h-screen w-full overflow-hidden gpu-accelerated flex items-center',
        isLight ? 'bg-[#F8F7F2]' : 'bg-[#060807]',
      )}
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <div
          ref={imageLayerRef}
          className="layer-far absolute inset-0 will-change-transform transition-opacity duration-500"
        >
          <Image
            src={imageSrc || '/placeholder.svg'}
            alt=""
            aria-hidden="true"
            fill
            unoptimized
            priority
            quality={100}
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
        <div className="relative z-30 flex flex-col justify-between h-full w-full pl-4 sm:pl-8 md:pl-36 lg:pl-60 xl:pl-64 pr-4 sm:pr-8 pt-16 sm:pt-20 lg:pt-16 pb-16 sm:pb-20 lg:pb-20 overflow-y-auto lg:overflow-visible">
          {/* Upper / Center Column: Typography & CTAs */}
          <div
            className={cn(
              'w-full max-w-[540px] lg:max-w-[560px] my-auto transition-all duration-300',
            )}
          >
            {/* Eyebrow */}
            <div className="reveal mb-2.5 flex items-center gap-2.5">
              <span
                className={cn(
                  'text-[11px] sm:text-[12px] font-sans font-bold uppercase tracking-[0.2em] transition-colors duration-300',
                  isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E] drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]',
                )}
              >
                {chapter.eyebrow}
              </span>
            </div>

            {/* Headline */}
            <h2
              className={cn(
                'reveal text-balance text-2xl sm:text-3xl lg:text-[3rem] xl:text-[3.25rem] font-sans font-extrabold leading-[1.14] tracking-[-0.02em] transition-colors duration-300',
                isLight ? 'text-[#1E1E1E]' : 'text-[#F5F3EC]',
              )}
            >
              {chapter.title.map((line, li) => (
                <span key={li} className="block">
                  {line.map((seg, si) => (
                    <span
                      key={si}
                      className={cn(
                        seg.accent &&
                        (isLight ? 'text-[#3D6436] font-black' : 'text-[#6B9E5E] font-black'),
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
                'reveal mt-3 h-0.5 w-10 rounded-full transition-colors duration-300',
                isLight ? 'bg-[#3D6436]' : 'bg-[#6B9E5E]',
              )}
            />

            {/* Description Paragraph */}
            {chapter.description && (
              <p
                className={cn(
                  'reveal mt-3.5 max-w-[500px] text-xs sm:text-sm lg:text-[14.5px] font-medium leading-[1.65] transition-colors duration-300',
                  isLight ? 'text-gray-700' : 'text-slate-300',
                )}
              >
                {chapter.description}
              </p>
            )}

            {/* Action Buttons matching mockup */}
            <div className="reveal mt-6 flex flex-wrap items-center gap-4">
              {/* Primary Green Pill Button */}
              {chapter.primaryCta && (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenModal) onOpenModal()
                  }}
                  className={cn(
                    'group inline-flex items-center gap-2.5 rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-xs font-bold tracking-[0.14em] text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer',
                    isLight
                      ? 'bg-[#3D6436] hover:bg-[#2E4C29]'
                      : 'bg-[#588B4B] hover:bg-[#46703B]',
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
                    'group inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold transition-colors duration-200 cursor-pointer underline-offset-4 hover:underline',
                    isLight ? 'text-[#3D6436] hover:text-[#2E4C29]' : 'text-[#6B9E5E] hover:text-white',
                  )}
                >
                  <span>{chapter.secondaryCta.label}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Floating 4-Card Bar matching mockup */}
          {chapter.bottomCards && (
            <div className="reveal mt-auto pt-4 w-full">
              <div
                className={cn(
                  'w-full max-w-5xl rounded-2xl p-4 sm:p-5 backdrop-blur-xl border shadow-xl transition-all duration-300 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
                  isLight
                    ? 'bg-white/95 border-gray-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
                    : 'bg-[#0A0D0A]/90 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)]',
                )}
              >
                {chapter.bottomCards.map((card, i) => {
                  const Icon = CARD_ICON[card.icon] || Sprout
                  return (
                    <div key={i} className="flex items-start gap-3.5 group">
                      <div
                        className={cn(
                          'grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:scale-105',
                          isLight
                            ? 'bg-[#3D6436]/10 text-[#3D6436]'
                            : 'bg-[#588B4B]/20 text-[#6B9E5E]',
                        )}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <div className="pt-0.5">
                        <h4
                          className={cn(
                            'text-xs sm:text-[13px] font-bold leading-tight transition-colors duration-200',
                            isLight ? 'text-gray-900' : 'text-white',
                          )}
                        >
                          {card.title}
                        </h4>
                        <p
                          className={cn(
                            'mt-1 text-[11px] leading-relaxed transition-colors duration-200',
                            isLight ? 'text-gray-600' : 'text-slate-400',
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
