'use client'

import { useState, useCallback } from 'react'
import { CHAPTERS } from '@/lib/chapters'
import { SidebarNav } from '@/components/sidebar-nav'
import { ProducerCta } from '@/components/producer-cta'
import { ChapterStage } from '@/components/chapter-stage'
import { Particles } from '@/components/particles'
import { SmoothScroll } from '@/components/smooth-scroll'
import { Footer } from '@/components/footer'
import { ProducerModal } from '@/components/producer-modal'
import { Preloader } from '@/components/preloader'
import { ThemeProvider } from '@/components/theme-context'

export function Experience() {
  const [active, setActive] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const onActive = useCallback((i: number) => setActive(i), [])
  const handleOpenModal = useCallback(() => setIsModalOpen(true), [])
  const handleCloseModal = useCallback(() => setIsModalOpen(false), [])

  const onNavigate = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const progress = (active - 1) / (CHAPTERS.length - 1)

  return (
    <ThemeProvider>
      {/* Root fills viewport with native scroll — no overflow restriction */}
      <div style={{ position: 'relative', minHeight: '100vh' }}>

        {/* ── Loading screen (fixed, portal-like) ── */}
        <Preloader />

        {/* ── Smooth scroll driver (no-op shim when Lenis unavailable) ── */}
        <SmoothScroll />

        {/* ── Ambient background particles ── */}
        <Particles />

        {/* ── Fixed UI chrome (all use position:fixed so they sit above chapters) ── */}
        <SidebarNav activeIndex={active} onNavigate={onNavigate} progress={progress} />
        <ProducerCta onTabClick={onNavigate} onOpenModal={handleOpenModal} />
        <Footer onOpenModal={handleOpenModal} />

        {/* ── Scrollable chapter list — native window scroll ── */}
        <main>
          {CHAPTERS.map((c) => (
            <ChapterStage
              key={c.id}
              chapter={c}
              activeIndex={active}
              onActive={onActive}
            />
          ))}
        </main>

        {/* ── Modal ── */}
        <ProducerModal isOpen={isModalOpen} onClose={handleCloseModal} />
      </div>
    </ThemeProvider>
  )
}
