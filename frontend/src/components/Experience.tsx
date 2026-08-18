'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
  const activeRef = useRef(1)
  activeRef.current = active

  const onActive = useCallback((i: number) => setActive(i), [])
  const handleOpenModal = useCallback(() => setIsModalOpen(true), [])
  const handleCloseModal = useCallback(() => setIsModalOpen(false), [])

  const onNavigate = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const lenis = (window as any).__lenis
    if (lenis) {
      lenis.scrollTo(el, { offset: 0, duration: 0.8, immediate: false })
    } else {
      const top = el.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  // Real-time viewport center scroll listener for 100% accurate sidebar sync on any scroll
  useEffect(() => {
    let ticking = false
    const updateActiveFromScroll = () => {
      const vCenter = window.innerHeight / 2
      let closestChapter = 1
      let minDistance = Infinity

      for (const ch of CHAPTERS) {
        const el = document.getElementById(ch.id)
        if (el) {
          const rect = el.getBoundingClientRect()
          const elCenter = rect.top + rect.height / 2
          const distance = Math.abs(elCenter - vCenter)
          if (distance < minDistance) {
            minDistance = distance
            closestChapter = ch.index
          }
        }
      }
      setActive(closestChapter)
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateActiveFromScroll)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Keyboard navigation listener (ArrowDown, ArrowUp, PageDown, PageUp, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey) return

      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault()
        const current = activeRef.current
        const nextIdx = current < CHAPTERS.length ? current + 1 : 1
        const nextChapter = CHAPTERS.find((c) => c.index === nextIdx)
        if (nextChapter) {
          setActive(nextIdx)
          onNavigate(nextChapter.id)
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault()
        const current = activeRef.current
        const prevIdx = current > 1 ? current - 1 : CHAPTERS.length
        const prevChapter = CHAPTERS.find((c) => c.index === prevIdx)
        if (prevChapter) {
          setActive(prevIdx)
          onNavigate(prevChapter.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, { passive: false })
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
