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
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const activeRef = useRef(1)
  activeRef.current = active

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

  const isWheelLockedRef = useRef(false)
  const wheelTimerRef = useRef<number | null>(null)

  // Direct tab-like mouse wheel navigation (clean discrete chapter transition on each wheel motion)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isModalOpen) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('.overflow-y-auto') ||
          target.closest('.overflow-auto'))
      ) {
        return
      }

      if (Math.abs(e.deltaY) < 18) return

      e.preventDefault()

      if (isWheelLockedRef.current) return
      isWheelLockedRef.current = true

      const current = activeRef.current
      if (e.deltaY > 0) {
        // Scroll Down -> Next Chapter or Footer
        if (current < CHAPTERS.length) {
          const nextIdx = current + 1
          setActive(nextIdx)
          const nextChapter = CHAPTERS.find((c) => c.index === nextIdx)
          if (nextChapter) onNavigate(nextChapter.id)
        } else {
          const footer = document.getElementById('footer')
          if (footer) footer.scrollIntoView({ behavior: 'smooth' })
        }
      } else {
        // Scroll Up -> Prev Chapter
        if (current > 1) {
          const prevIdx = current - 1
          setActive(prevIdx)
          const prevChapter = CHAPTERS.find((c) => c.index === prevIdx)
          if (prevChapter) onNavigate(prevChapter.id)
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }

      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = window.setTimeout(() => {
        isWheelLockedRef.current = false
      }, 550)
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
    }
  }, [isModalOpen, onNavigate])

  // Direct touch swipe navigation (clean discrete chapter transition on touch swipe gestures)
  useEffect(() => {
    let touchStartY = 0
    let touchStartX = 0
    let touchStartTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (isModalOpen || e.touches.length !== 1) return
      touchStartY = e.touches[0].clientY
      touchStartX = e.touches[0].clientX
      touchStartTime = Date.now()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (isModalOpen || !e.changedTouches || e.changedTouches.length === 0) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable ||
          target.closest('button') ||
          target.closest('.overflow-y-auto') ||
          target.closest('.overflow-auto'))
      ) {
        return
      }

      const touchEndY = e.changedTouches[0].clientY
      const touchEndX = e.changedTouches[0].clientX
      const deltaY = touchStartY - touchEndY // Positive = swipe up (go next), Negative = swipe down (go prev)
      const deltaX = Math.abs(touchStartX - touchEndX)
      const duration = Date.now() - touchStartTime

      // Must be a distinct vertical swipe with sufficient distance (> 35px) and within 1000ms
      if (Math.abs(deltaY) > 35 && Math.abs(deltaY) > deltaX * 1.15 && duration < 1000) {
        if (isWheelLockedRef.current) return
        isWheelLockedRef.current = true

        const current = activeRef.current
        if (deltaY > 0) {
          // Swipe Up -> Next Chapter or Footer
          if (current < CHAPTERS.length) {
            const nextIdx = current + 1
            setActive(nextIdx)
            const nextChapter = CHAPTERS.find((c) => c.index === nextIdx)
            if (nextChapter) onNavigate(nextChapter.id)
          } else {
            const footer = document.getElementById('footer')
            if (footer) footer.scrollIntoView({ behavior: 'smooth' })
          }
        } else {
          // Swipe Down -> Prev Chapter
          if (current > 1) {
            const prevIdx = current - 1
            setActive(prevIdx)
            const prevChapter = CHAPTERS.find((c) => c.index === prevIdx)
            if (prevChapter) onNavigate(prevChapter.id)
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }

        if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
        wheelTimerRef.current = window.setTimeout(() => {
          isWheelLockedRef.current = false
        }, 500)
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isModalOpen, onNavigate])

  // Keyboard navigation listener (Arrow keys / PageDown / PageUp / Tab)
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

      // ArrowDown, PageDown, Tab -> Next Chapter
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'Tab' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault()
        const current = activeRef.current
        const nextIdx = current < CHAPTERS.length ? current + 1 : 1
        const nextChapter = CHAPTERS.find((c) => c.index === nextIdx)
        if (nextChapter) {
          setActive(nextIdx)
          onNavigate(nextChapter.id)
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === 'Tab' && e.shiftKey) || (e.key === ' ' && e.shiftKey)) {
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
