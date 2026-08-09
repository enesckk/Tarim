'use client'

import React, { useEffect, useRef, memo } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Satellite,
  BrainCircuit,
  Smartphone,
  User,
  Activity,
  Sprout,
  Leaf,
  Play,
  ArrowRight,
} from 'lucide-react'
import type { Chapter, Feature } from '@/lib/chapters'
import { SceneFx } from '@/components/scene-fx'
import { ImpactStats } from '@/components/impact-stats'
import { LandSlider } from '@/components/land-slider'
import { SatelliteHud } from '@/components/satellite-hud'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'
import { SECTION_ART_DIRECTION } from '@/lib/motion'

gsap.registerPlugin(ScrollTrigger)

const FEATURE_ICON: Record<Feature['icon'], React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  satellite: Satellite,
  brain: BrainCircuit,
  phone: Smartphone,
  user: User,
  chart: Activity,
  sprout: Sprout,
  home: Leaf,
  analiz: Satellite,
  vizyon: Leaf,
  basvuru: User,
  takip: Activity,
  egitim: Leaf,
  uretim: Sprout,
  hasat: Leaf,
  pazara: Leaf,
}

interface ChapterStageProps {
  chapter: Chapter
  activeIndex: number
  onActive: (index: number) => void
}

function ChapterStageComponent({
  chapter,
  activeIndex,
  onActive,
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
        // Parallax background image movement
        if (far) {
          gsap.fromTo(
            far,
            { yPercent: -4, scale: 1.02 },
            {
              yPercent: 4,
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

        // Ultra-snappy reveal animation for content as user scrolls in
        if (reveals.length > 0) {
          gsap.fromTo(
            reveals,
            { opacity: 0, y: 18 },
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

      // Track active chapter for sidebar navigation
      ScrollTrigger.create({
        trigger: root,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: (self) => {
          if (self.isActive) onActive(chapter.index)
        },
      })
    }, root)

    return () => ctx.revert()
  }, [chapter.index, onActive])

  const isLight = theme === 'light'
  const isHero = chapter.index === 1

  // Asset selection for Light and Dark modes
  let imageSrc = chapter.image
  if (isLight) {
    const lightMap: Record<string, string> = {
      baslangic: '/chapters/baslangic-light.png',
      analiz: '/chapters/analiz-light.png',
      vizyon: '/chapters/vizyon-light.png',
      'dijital-takip': '/chapters/dijital-takip-light.png',
      egitim: '/chapters/egitim-light.png',
      uretim: '/chapters/uretim-light.png',
      hasat: '/chapters/hasat-light.png',
      pazara: '/chapters/pazara-light.png',
    }
    if (lightMap[chapter.id]) imageSrc = lightMap[chapter.id]
  }

  const artDir = SECTION_ART_DIRECTION[chapter.id] || { className: 'object-right' }

  return (
    <section
      ref={rootRef}
      id={chapter.id}
      data-chapter={chapter.index}
      className={cn(
        'relative h-screen w-full overflow-hidden gpu-accelerated flex items-center',
        isLight ? 'bg-[#FAF8F3]' : 'bg-[#060807]',
      )}
      aria-label={chapter.navLabel}
    >
      <div className="relative h-screen w-full overflow-hidden flex items-center">
        {/* Full-Bleed Background Visual Layer: 100% Complete, Vibrant & Unobscured Picture Display */}
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
            priority={isHero}
            loading={isHero ? undefined : 'lazy'}
            quality={100}
            sizes="100vw"
            className={cn(
              'object-cover select-none gpu-accelerated opacity-100 transition-all duration-300',
              isLight ? 'contrast-100 brightness-100' : 'contrast-105 brightness-105',
              artDir.className,
            )}
            draggable={false}
          />
        </div>

        {/* Perfect Sweet-Spot Ambient Overlay: Solid theme background behind text, 100% full-color vibrant picture on right */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-10 transition-colors duration-300',
            isLight
              ? 'bg-[linear-gradient(180deg,rgba(250,248,243,0.40)_0%,rgba(250,248,243,0.85)_100%)] lg:bg-[linear-gradient(90deg,#FAF8F3_0%,#FAF8F3_32%,rgba(250,248,243,0.72)_48%,transparent_72%)]'
              : 'bg-[linear-gradient(180deg,rgba(6,8,7,0.40)_0%,rgba(6,8,7,0.85)_100%)] lg:bg-[linear-gradient(90deg,#060807_0%,#060807_32%,rgba(6,8,7,0.72)_48%,transparent_72%)]',
          )}
        />

        {/* Scene FX */}
        <SceneFx scene={chapter.scene} />

        {/* Main Content Area: Left Text Column with Perfect Balanced Padding */}
        <div className="relative z-30 flex h-full w-full items-center pl-4 sm:pl-8 md:pl-36 lg:pl-60 xl:pl-64 pr-4 sm:pr-8 pt-24 sm:pt-28 lg:pt-0 pb-24 lg:pb-0 overflow-y-auto lg:overflow-visible">
          <div
            className={cn(
              'w-full max-w-[560px] rounded-2xl lg:rounded-none p-5 sm:p-7 lg:p-0 backdrop-blur-md lg:backdrop-blur-none transition-all duration-300 shadow-2xl lg:shadow-none border lg:border-none my-auto lg:my-0',
              isLight
                ? 'bg-[#FAF8F3]/85 border-[#B8842F]/25 lg:bg-transparent'
                : 'bg-[#060807]/80 border-white/15 lg:bg-transparent',
            )}
          >
            {/* Eyebrow / Subtitle */}
            <div className="reveal mb-3 flex items-center gap-3">
              <span
                className={cn(
                  'text-[11px] sm:text-[12px] font-sans font-extrabold uppercase tracking-[0.24em] transition-colors duration-300',
                  isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E] drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]',
                )}
              >
                {chapter.eyebrow}
              </span>
            </div>

            {/* Headline: Clean Modern Sans-Serif Font Across All Chapters */}
            <h2
              className={cn(
                'reveal text-balance text-2xl sm:text-3xl lg:text-[3.25rem] xl:text-[3.5rem] font-sans font-extrabold leading-[1.14] tracking-[-0.02em] transition-colors duration-300',
                isLight ? 'text-[#0E1110] drop-shadow-[0_1px_8px_rgba(250,248,243,0.9)]' : 'text-[#F5F3EC] drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]',
              )}
            >
              {chapter.title.map((line, li) => (
                <span key={li} className="block">
                  {line.map((seg, si) => (
                    <span
                      key={si}
                      className={cn(
                        seg.accent &&
                        (isLight ? 'text-[#9E6F22] font-black' : 'text-[#D6AE5E] font-black'),
                      )}
                    >
                      {seg.text}
                    </span>
                  ))}
                </span>
              ))}
            </h2>

            {/* Small accent bar line below headline */}
            <div
              className={cn(
                'reveal mt-3.5 h-0.5 w-10 rounded-full transition-colors duration-300',
                isLight ? 'bg-[#9E6F22]' : 'bg-[#D6AE5E]',
              )}
            />

            {/* Description Paragraph */}
            {chapter.description && (
              <p
                className={cn(
                  'reveal mt-4 max-w-[520px] text-xs sm:text-sm lg:text-[15px] font-medium leading-[1.65] transition-colors duration-300',
                  isLight ? 'text-[#242926] drop-shadow-[0_1px_6px_rgba(250,248,243,0.8)]' : 'text-[#E0E0E0] drop-shadow-[0_1px_10px_rgba(0,0,0,0.9)]',
                )}
              >
                {chapter.description}
              </p>
            )}

            {/* Horizontal Bullets List if present */}
            {chapter.bullets && (
              <div className="reveal mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-[13px] font-semibold">
                {chapter.bullets.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={cn('font-black', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')}>•</span>
                    <span className={isLight ? 'text-[#0E1110]' : 'text-slate-100'}>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Interactive Before/After Land Slider for Section 02 */}
            {chapter.index === 2 && <LandSlider />}

            {/* Live Impact Statistics Module for Section 03 */}
            {chapter.index === 3 && <ImpactStats />}

            {/* Live Satellite & Drone Telemetry HUD for Section 04 */}
            {chapter.index === 4 && <SatelliteHud />}

            {/* Features if present */}
            {chapter.features && (
              <div className="reveal mt-6 flex flex-wrap gap-x-6 gap-y-4">
                {chapter.features.map((f, i) => {
                  const Icon = FEATURE_ICON[f.icon]
                  return (
                    <div key={i} className="flex max-w-[16rem] items-start gap-3 group">
                      <span
                        className={cn(
                          'grid h-10 w-10 shrink-0 place-items-center rounded-full border shadow-sm transition-all duration-300 group-hover:scale-105',
                          isLight
                            ? 'border-[#B8842F]/40 text-[#9E6F22] bg-white group-hover:border-[#9E6F22]'
                            : 'border-[#D6AE5E]/40 text-[#D6AE5E] bg-black/80 group-hover:border-[#D6AE5E]',
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
                      </span>
                      <div className="pt-0.5">
                        <p
                          className={cn(
                            'text-xs sm:text-[14px] font-bold leading-snug transition-colors duration-300',
                            isLight ? 'text-[#0E1110]' : 'text-white',
                          )}
                        >
                          {f.title}
                        </p>
                        {f.desc && (
                          <p
                            className={cn(
                              'mt-0.5 text-[11px] sm:text-[12px] leading-relaxed transition-colors duration-300',
                              isLight ? 'text-[#333735]' : 'text-slate-300',
                            )}
                          >
                            {f.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* CTA Play / Action Button */}
            {chapter.cta && (
              <div className="reveal mt-7">
                {chapter.scene === 'apply' ? (
                  <button
                    type="button"
                    className={cn(
                      'group inline-flex items-center gap-3 rounded-full border px-6 py-3 text-xs font-bold tracking-[0.18em] transition-button-180 hover:scale-[1.02] active:scale-[0.99] shadow-md',
                      isLight
                        ? 'border-[#9E6F22] bg-[#9E6F22] text-white hover:bg-[#855B19]'
                        : 'border-[#D6AE5E]/60 bg-black/80 text-[#D6AE5E] hover:bg-[#D6AE5E] hover:text-black',
                    )}
                  >
                    {chapter.cta.label.toUpperCase()}
                    <span className="grid h-5 w-5 place-items-center rounded-full border border-current transition-transform duration-180 group-hover:translate-x-0.5">
                      <ArrowRight className="h-3 w-3" strokeWidth={2} />
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (chapter.id === 'pazara') {
                        const footer = document.getElementById('footer')
                        if (footer) footer.scrollIntoView({ behavior: 'smooth' })
                      }
                    }}
                    className="group inline-flex items-center gap-3.5 cursor-pointer"
                  >
                    <span
                      className={cn(
                        'grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-full border backdrop-blur-md transition-button-180 group-hover:scale-[1.05] active:scale-[0.98] shadow-md shrink-0',
                        isLight
                          ? 'border-[#B8842F]/40 bg-[#FAF8F3] text-[#9E6F22] group-hover:bg-[#9E6F22] group-hover:text-white'
                          : 'border-[#D6AE5E]/60 bg-black/80 text-[#D6AE5E] group-hover:border-[#D6AE5E] group-hover:shadow-[0_0_25px_rgba(214,174,94,0.4)]',
                      )}
                    >
                      <Play className="ml-0.5 h-4.5 w-4.5 sm:h-5 sm:w-5 fill-current transition-transform duration-180 group-hover:translate-x-0.5" strokeWidth={0} />
                    </span>
                    <span className="text-left">
                      <span
                        className={cn(
                          'block text-[11px] sm:text-[12px] font-sans font-extrabold tracking-[0.18em] uppercase transition-colors duration-300',
                          isLight ? 'text-[#0E1110]' : 'text-[#F5F3EC]',
                        )}
                      >
                        {chapter.cta.label.toUpperCase()}
                      </span>
                      {chapter.cta.sub && (
                        <span
                          className={cn(
                            'mt-0.5 block text-[10px] font-mono tracking-widest uppercase font-bold transition-colors duration-300',
                            isLight ? 'text-[#9E6F22]' : 'text-[#A8A8A8]',
                          )}
                        >
                          {chapter.cta.sub.toUpperCase()}
                        </span>
                      )}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export const ChapterStage = memo(ChapterStageComponent)
