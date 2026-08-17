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
    if (!el) return
    const lenis = (window as any).__lenis
    if (lenis) {
      lenis.scrollTo(el, { offset: 0, duration: 0.8 })
    } else {
      el.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
  }

  return (
    <>
      {/* EXPANDABLE FULL CORPORATE FOOTER PANEL */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
          <div
            className={cn(
              'w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t p-6 sm:p-10 shadow-2xl relative transition-all duration-300',
              isLight
                ? 'bg-[#F8F7F2] border-[#3D6436]/30 text-[#1E1E1E]'
                : 'bg-[#060807] border-[#6B9E5E]/30 text-white',
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
                  ? 'border-[#3D6436]/30 bg-white text-[#1E1E1E]'
                  : 'border-white/20 bg-black/60 text-white',
              )}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Grid Layout */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 pt-4">
              {/* Column 1: Brand & Philosophy */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 shrink-0">
                    <Image
                      src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
                      alt="Şehitkamil Strateji Logo"
                      width={36}
                      height={36}
                      className="w-full h-full object-contain drop-shadow"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-extrabold tracking-wider uppercase">
                      ŞEHİTKAMİL STRATEJİ
                    </h3>
                    <p className={cn('text-[10px] font-mono font-bold tracking-widest uppercase', isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]')}>
                      TARIM EKOSİSTEMİ
                    </p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed opacity-85">
                  Atıl arazileri üretime kazandıran, yerli tohumla geleceği inşa eden ve alım garantisi ile üreticiye güven sunan kamu ekosistemi.
                </p>

                <div className="pt-2 flex items-center gap-2">
                  <div className={cn('p-2 rounded-lg border flex items-center gap-2 text-xs font-semibold', isLight ? 'bg-white border-[#3D6436]/20 text-[#3D6436]' : 'bg-white/5 border-white/10 text-[#6B9E5E]')}>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Şekabel Kooperatifi</span>
                  </div>
                  <div className={cn('p-2 rounded-lg border flex items-center gap-2 text-xs font-semibold', isLight ? 'bg-white border-[#3D6436]/20 text-[#3D6436]' : 'bg-white/5 border-white/10 text-[#6B9E5E]')}>
                    <Award className="w-4 h-4" />
                    <span>Alım Garantili</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Quick Chapters */}
              <div className="space-y-3">
                <h4 className={cn('text-xs font-mono font-extrabold tracking-widest uppercase', isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]')}>
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
                          isLight ? 'text-gray-700 hover:text-[#3D6436]' : 'text-slate-300 hover:text-[#6B9E5E]',
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
                <h4 className={cn('text-xs font-mono font-extrabold tracking-widest uppercase', isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]')}>
                  TESİS VE BİRİMLER
                </h4>
                <ul className="space-y-2.5 text-xs">
                  <li className="font-semibold">AgroPark Eğitim & AR-GE Tesisleri</li>
                  <li className="font-semibold">Bitki Klonlama Doku Kültürü Laboratuvarı</li>
                  <li className="font-semibold">Lavanta & Aromatik Bitki Distilasyon Merkezi</li>
                  <li className="font-semibold">Şekabel Paketleme ve İşleme Tesisleri</li>
                  <li className="font-semibold">Şehitkamil Tarım Satış Mağazaları</li>
                </ul>
              </div>

              {/* Column 4: Contact & Legal */}
              <div className="space-y-3">
                <h4 className={cn('text-xs font-mono font-extrabold tracking-widest uppercase', isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]')}>
                  İLETİŞİM VE DESTEK
                </h4>
                <div className="space-y-2.5 text-xs leading-relaxed">
                  <p className="flex items-start gap-2.5">
                    <MapPin className={cn('w-4 h-4 shrink-0 mt-0.5', isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]')} />
                    <span>Şehitkamil Belediyesi Strateji Geliştirme Müdürlüğü, Gaziantep</span>
                  </p>
                  <p className="flex items-center gap-2.5">
                    <Phone className={cn('w-4 h-4 shrink-0', isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]')} />
                    <span className="font-mono">444 0 027 / 0342 232 11 11</span>
                  </p>
                  <p className="flex items-center gap-2.5">
                    <Mail className={cn('w-4 h-4 shrink-0', isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]')} />
                    <span>tarim@sehitkamil.bel.tr</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-current/10 text-[11px] opacity-80">
                  <p>© 2026 Şehitkamil Belediyesi. Tüm hakları saklıdır.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIXED ALWAYS-VISIBLE EXECUTIVE BOTTOM FOOTER BAR */}
      <footer
        id="footer"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl px-4 sm:px-8 py-2 sm:py-2.5 transition-all duration-300 flex items-center justify-between gap-3 shadow-2xl',
          isLight
            ? 'bg-white/95 border-[#3D6436]/20 text-[#1E1E1E]'
            : 'bg-black/95 border-[#588B4B]/30 text-white',
        )}
      >
        {/* Left: Custom Transparent Strateji Logo Badge */}
        <div className="flex items-center gap-3 truncate">
          <div className="relative w-7 h-7 shrink-0 flex items-center justify-center">
            <Image
              src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
              alt="Şehitkamil Strateji Logo"
              width={28}
              height={28}
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
                isLight ? 'text-[#3D6436]' : 'text-[#6B9E5E]',
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
                ? 'border-[#3D6436]/30 bg-[#F8F7F2] text-[#3D6436] hover:bg-[#3D6436] hover:text-white'
                : 'border-[#6B9E5E]/40 bg-white/5 text-[#6B9E5E] hover:bg-[#588B4B] hover:text-white',
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
                const el = document.getElementById('sosyal-uretim')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className={cn(
              'hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10.5px] font-sans font-extrabold tracking-wider uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md text-white',
              isLight
                ? 'bg-[#3D6436] hover:bg-[#2E4C29]'
                : 'bg-[#588B4B] hover:bg-[#46703B]',
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
