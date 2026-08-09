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
      <div className="relative min-h-screen">
        {/* Sinematik İlk Açılış & Yenileme Yükleme Animasyonu */}
        <Preloader />

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
