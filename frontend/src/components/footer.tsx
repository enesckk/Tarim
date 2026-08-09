'use client'

import React, { useState, memo } from 'react'
import Image from 'next/image'
import {
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Award,
  Globe,
  HeartHandshake,
  ChevronUp,
  X,
} from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'
import { CHAPTERS } from '@/lib/chapters'

interface FooterProps {
  onOpenModal?: () => void
}

function FooterComponent({ onOpenModal }: FooterProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [isExpanded, setIsExpanded] = useState(false)

  const scrollToChapter = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* EXPANDABLE FULL CORPORATE FOOTER PANEL */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div
            className={cn(
              'w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t p-6 sm:p-10 shadow-2xl relative transition-all duration-300',
              isLight
                ? 'bg-[#FAF8F3] border-[#B8842F]/30 text-[#1E1E1E]'
                : 'bg-[#060807] border-[#D6AE5E]/30 text-white',
            )}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              aria-label="Kapat"
              className={cn(
                'absolute top-6 right-6 p-2 rounded-full border transition-all duration-200 hover:scale-110 active:scale-95',
                isLight
                  ? 'border-[#B8842F]/30 bg-white text-[#1E1E1E]'
                  : 'border-white/20 bg-black/60 text-white',
              )}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="max-w-7xl mx-auto space-y-10">
              {/* Header Banner */}
              <div className="flex items-center gap-3.5">
                <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                  <Image
                    src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
                    alt="Şehitkamil Strateji ve Geliştirme Merkezi"
                    width={48}
                    height={48}
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                </div>
                <div>
                  <h3 className="font-sans font-extrabold text-lg sm:text-xl tracking-wider uppercase">
                    ŞEHİTKAMİL STRATEJİ VE GELİŞTİRME MERKEZİ
                  </h3>
                  <p className="text-xs font-mono text-[#9E6F22] dark:text-[#D6AE5E] tracking-widest uppercase font-bold">
                    ORTAK AKIL PLATFORMU • TARIM EKOSİSTEMİ PORTALI
                  </p>
                </div>
              </div>

              {/* 4-Column Corporate Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-4 border-t border-current/10">
                {/* Column 1: Brand & Mission */}
                <div className="space-y-3">
                  <h4 className={cn('text-xs font-mono font-extrabold tracking-widest uppercase', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')}>
                    VİZYONUMUZ
                  </h4>
                  <p className={cn('text-xs leading-relaxed font-medium', isLight ? 'text-[#333735]' : 'text-slate-300')}>
                    Yerli ve milli tohumdan toprağa can, ekonomiye kan, aileye imkan. Şehitkamil Belediyesi ve Şekabel Kooperatifi güvencesiyle sürdürülebilir tarım geleceği.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-xs font-semibold">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className={cn('w-4 h-4', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')} />
                      <span>Garantili Alım</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className={cn('w-4 h-4', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')} />
                      <span>%100 Yerli Tohum</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Quick Chapters */}
                <div className="space-y-3">
                  <h4 className={cn('text-xs font-mono font-extrabold tracking-widest uppercase', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')}>
                    PROJE SÜREÇLERİ
                  </h4>
                  <ul className="space-y-2 text-xs font-semibold">
                    {CHAPTERS.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            scrollToChapter(c.id)
                            setIsExpanded(false)
                          }}
                          className={cn(
                            'flex items-center gap-2 transition-colors duration-200 hover:translate-x-1',
                            isLight ? 'text-[#333735] hover:text-[#9E6F22]' : 'text-slate-300 hover:text-[#D6AE5E]',
                          )}
                        >
                          <span className="font-mono text-[10px] opacity-70">0{c.index}</span>
                          <span>{c.navLabel}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Column 3: Units & Facilities */}
                <div className="space-y-3">
                  <h4 className={cn('text-xs font-mono font-extrabold tracking-widest uppercase', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')}>
                    BİRİMLER & AKREDİTASYON
                  </h4>
                  <ul className={cn('space-y-2 text-xs font-medium', isLight ? 'text-[#333735]' : 'text-slate-300')}>
                    <li className="flex items-start gap-2">
                      <Globe className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                      <span>Agropark Tarımsal Eğitim & Araştırma Merkezi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Globe className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                      <span>Şekabel Lojistik & Soğuk Hava Depolama Tesisleri</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Globe className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                      <span>Toprak & Yaprak Analizi Laboratuvar Kompleksi</span>
                    </li>
                  </ul>
                </div>

                {/* Column 4: Contact */}
                <div className="space-y-3">
                  <h4 className={cn('text-xs font-mono font-extrabold tracking-widest uppercase', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')}>
                    İLETİŞİM & DESTEK
                  </h4>
                  <div className={cn('space-y-2.5 text-xs font-medium', isLight ? 'text-[#333735]' : 'text-slate-300')}>
                    <div className="flex items-start gap-2">
                      <MapPin className={cn('w-4 h-4 shrink-0 mt-0.5', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')} />
                      <span>Gaziantep Şehitkamil Tarımsal Hizmetler Kampüsü</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className={cn('w-4 h-4 shrink-0', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')} />
                      <span>Çiftçi Destek: 444 0 027</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className={cn('w-4 h-4 shrink-0', isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]')} />
                      <span>info@sehitkamil.bel.tr</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Copyright */}
              <div className="pt-4 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono opacity-80">
                <p>© 2026 T.C. Şehitkamil Belediyesi & Şekabel Kooperatifi.</p>
                <p className="flex items-center gap-3">
                  <span className="hover:underline cursor-pointer">Gizlilik</span>
                  <span>•</span>
                  <span className="hover:underline cursor-pointer">KVKK</span>
                  <span>•</span>
                  <span className="hover:underline cursor-pointer">Sözleşme</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIXED ALWAYS-VISIBLE TOPBAR-LIKE EXECUTIVE BOTTOM FOOTER BAR */}
      <footer
        id="footer"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl px-4 sm:px-8 py-2 sm:py-2.5 transition-all duration-300 flex items-center justify-between gap-3 shadow-2xl',
          isLight
            ? 'bg-white/90 border-[#B8842F]/25 text-[#1E1E1E]'
            : 'bg-black/90 border-[#D6AE5E]/30 text-white',
        )}
      >
        {/* Left: Custom Transparent Strateji Logo Badge & Support */}
        <div className="flex items-center gap-3 truncate">
          <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
            <Image
              src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
              alt="Şehitkamil Strateji Logo"
              width={44}
              height={44}
              className="w-full h-full object-contain drop-shadow"
            />
          </div>
          <div className="truncate">
            <span className="block text-[11px] font-sans font-extrabold tracking-wider uppercase leading-none truncate">
              ŞEHİTKAMİL STRATEJİ
            </span>
            <span
              className={cn(
                'block text-[8.5px] font-mono tracking-widest uppercase font-semibold leading-tight truncate hidden xs:block',
                isLight ? 'text-[#9E6F22]' : 'text-[#D6AE5E]',
              )}
            >
              ORTAK AKIL PLATFORMU • 444 0 027
            </span>
          </div>
        </div>

        {/* Right: Expand Corporate Details & Application Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10.5px] font-sans font-extrabold tracking-wider uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
              isLight
                ? 'border-[#B8842F]/40 bg-[#FAF8F3] text-[#9E6F22] hover:bg-[#B8842F] hover:text-white'
                : 'border-[#D6AE5E]/40 bg-white/5 text-[#D6AE5E] hover:bg-[#D6AE5E] hover:text-black',
            )}
          >
            <span>KURUMSAL BİLGİ</span>
            <ChevronUp className={cn('w-3.5 h-3.5 transition-transform duration-300', isExpanded && 'rotate-180')} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenModal) onOpenModal()
              else {
                const el = document.getElementById('basvuru')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className={cn(
              'hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10.5px] font-sans font-extrabold tracking-wider uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md',
              isLight
                ? 'bg-[#9E6F22] text-white hover:bg-[#855B19]'
                : 'bg-[#D6AE5E] text-black hover:bg-[#C29B4B]',
            )}
          >
            <span>BAŞVURU YAP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>
    </>
  )
}

export const Footer = memo(FooterComponent)
