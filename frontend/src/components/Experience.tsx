'use client'

import { useState, useCallback, useEffect } from 'react'
import { CHAPTERS } from '@/lib/chapters'
import { SidebarNav } from '@/components/sidebar-nav'
import { ProducerCta } from '@/components/producer-cta'
import { ChapterStage } from '@/components/chapter-stage'
import { Particles } from '@/components/particles'
import { SmoothScroll } from '@/components/smooth-scroll'
import { Footer } from '@/components/footer'
import { ProducerModal } from '@/components/producer-modal'
import { ThemeProvider } from '@/components/theme-context'

export function Experience() {
  const [active, setActive] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const onActive = useCallback((i: number) => setActive(i), [])
  const handleOpenModal = useCallback(() => setIsModalOpen(true), [])
  const handleCloseModal = useCallback(() => setIsModalOpen(false), [])

  const onNavigate = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const lenis = (window as any).__lenis
    if (lenis) {
      lenis.scrollTo(el, { offset: 0, duration: 0.8 })
    } else {
      el.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
  }, [])

  // Keyboard navigation listener (Arrow keys / PageDown / PageUp)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore OS shortcut combinations
      if (e.altKey || e.metaKey || e.ctrlKey) return

      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      // ArrowDown, PageDown -> Next Chapter
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        setActive((prev) => {
          const nextIdx = prev < CHAPTERS.length ? prev + 1 : 1
          const nextChapter = CHAPTERS.find((c) => c.index === nextIdx)
          if (nextChapter) {
            onNavigate(nextChapter.id)
          }
          return nextIdx
        })
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        setActive((prev) => {
          const prevIdx = prev > 1 ? prev - 1 : CHAPTERS.length
          const prevChapter = CHAPTERS.find((c) => c.index === prevIdx)
          if (prevChapter) {
            onNavigate(prevChapter.id)
          }
          return prevIdx
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigate])

  const progress = (active - 1) / (CHAPTERS.length - 1)

  return (
    <ThemeProvider>
      <div className="relative min-h-screen">
        <SmoothScroll />

        {/* ambient particles */}
        <Particles />

        {/* fixed vertical stepper timeline sidebar */}
        <SidebarNav
          activeIndex={active}
          onNavigate={onNavigate}
          progress={progress}
        />

        {/* fixed top header bar */}
        <ProducerCta onTabClick={onNavigate} onOpenModal={handleOpenModal} />

        {/* fullscreen chapter stages */}
        <main className="relative w-full">
          {CHAPTERS.map((c) => (
            <ChapterStage
              key={c.id}
              chapter={c}
              activeIndex={active}
              onActive={onActive}
              onOpenModal={handleOpenModal}
            />
          ))}
        </main>

        {/* Modern Corporate Executive Footer */}
        <Footer onOpenModal={handleOpenModal} />

        {/* Executive Producer Application Modal */}
        <ProducerModal isOpen={isModalOpen} onClose={handleCloseModal} />
      </div>
    </ThemeProvider>
  )
}
