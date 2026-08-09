'use client'

import React, { useState, memo } from 'react'
import Image from 'next/image'
import {
  X,
  CheckCircle2,
  Sprout,
  User,
  MapPin,
  FileText,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Award,
  Sparkles,
  Phone,
  Send,
  Building2,
  Tractor,
} from 'lucide-react'
import { useTheme } from '@/components/theme-context'
import { cn } from '@/lib/utils'

interface ProducerModalProps {
  isOpen: boolean
  onClose: () => void
}

const PRODUCE_TYPES = [
  'Gaziantep Antep Fıstığı',
  'Zeytin & Zeytinyağı',
  'Bağcılık (Üzüm & Pekmez)',
  'Buğday & Arpa',
  'Pamuk & Lifli Bitkiler',
  'Mevsimsel Sebze & Meyve',
  'Atıl Arazi Dönüşüm Talebi',
]

const SUPPORT_TYPES = [
  'Garantili Alım Sözleşmesi',
  'Sertifikalı Tohum & Gübre Desteği',
  'Ücretsiz Toprak & Yaprak Analizi',
  'Agropark Dronlu Uydu Takibi',
  'Soğuk Hava Deposu & Lojistik Desteği',
]

function ProducerModalComponent({ isOpen, onClose }: ProducerModalProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [trackingCode, setTrackingCode] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    tcNo: '',
    phone: '',
    district: 'Şehitkamil',
    neighborhood: '',
    landStatus: 'mulk', // mulk | kiralik | atil
    landSize: '',
    selectedProducts: [] as string[],
    selectedSupports: [] as string[],
    hasIrrigation: 'evet',
    kvkkConsent: false,
  })

  if (!isOpen) return null

  const handleProductToggle = (prod: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(prod)
        ? prev.selectedProducts.filter((p) => p !== prod)
        : [...prev.selectedProducts, prod],
    }))
  }

  const handleSupportToggle = (sup: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedSupports: prev.selectedSupports.includes(sup)
        ? prev.selectedSupports.filter((s) => s !== sup)
        : [...prev.selectedSupports, sup],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = `SKT-2026-${Math.floor(100000 + Math.random() * 900000)}`
    setTrackingCode(code)
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
      <div
        className={cn(
          'relative w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 my-auto',
          isLight
            ? 'bg-[#FAF8F3] border-[#B8842F]/30 text-[#1E1E1E]'
            : 'bg-[#060807] border-[#D6AE5E]/30 text-white',
        )}
      >
        {/* Background Ambient Glow */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[250px] rounded-full blur-[120px] opacity-20',
            isLight ? 'bg-[#B8842F]' : 'bg-[#D6AE5E]',
          )}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className={cn(
            'absolute top-5 right-5 p-2 rounded-full border transition-all duration-200 hover:scale-110 active:scale-95 z-20',
            isLight
              ? 'border-[#B8842F]/30 bg-white text-[#1E1E1E]'
              : 'border-white/20 bg-black/60 text-white',
          )}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 sm:p-8 border-b border-current/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src={isLight ? '/logo/sehitkamil-logo-light.png' : '/logo/sehitkamil-logo-dark.png'}
                alt="Şehitkamil Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold tracking-widest uppercase bg-[#9E6F22]/10 text-[#9E6F22] dark:text-[#D6AE5E]">
                <Sparkles className="w-3 h-3" />
                <span>ŞEHİTKAMİL TARIM EKOSİSTEMİ</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-sans font-extrabold tracking-tight uppercase leading-tight pt-1">
                ÜRETİCİ BAŞVURU PORTALI
              </h2>
            </div>
          </div>

          {/* Stepper Progress Bar (Only visible if not submitted) */}
          {!submitted && (
            <div className="mt-6 grid grid-cols-4 gap-2">
              {[
                { num: 1, label: 'Kimlik' },
                { num: 2, label: 'Arazi' },
                { num: 3, label: 'Destek' },
                { num: 4, label: 'Onay' },
              ].map((s) => (
                <div key={s.num} className="space-y-1.5">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      step >= s.num
                        ? isLight
                          ? 'bg-[#9E6F22]'
                          : 'bg-[#D6AE5E]'
                        : isLight
                        ? 'bg-[#B8842F]/20'
                        : 'bg-white/10',
                    )}
                  />
                  <span
                    className={cn(
                      'block text-[10px] font-mono font-bold tracking-wider uppercase text-center',
                      step === s.num
                        ? isLight
                          ? 'text-[#9E6F22]'
                          : 'text-[#D6AE5E]'
                        : 'opacity-50',
                    )}
                  >
                    0{s.num} {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-8 relative z-10 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto">
          {submitted ? (
            /* SUCCESS SCREEN */
            <div className="text-center space-y-6 py-6 animate-in zoom-in-95 duration-300">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 mx-auto shadow-xl">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-sans font-extrabold tracking-tight uppercase">
                  BAŞVURUNUZ BAŞARIYLA ALINDI!
                </h3>
                <p className={cn('text-xs max-w-md mx-auto leading-relaxed', isLight ? 'text-[#333735]' : 'text-slate-300')}>
                  T.C. Şehitkamil Belediyesi ve Şekabel Kooperatifi uzman saha ekiplerimiz en geç 48 saat içerisinde sizinle iletişime geçecektir.
                </p>
              </div>

              {/* Tracking Code Box */}
              <div
                className={cn(
                  'max-w-xs mx-auto p-4 rounded-2xl border backdrop-blur-md text-center space-y-1',
                  isLight
                    ? 'bg-white border-[#B8842F]/30 shadow-md'
                    : 'bg-black/60 border-[#D6AE5E]/40 shadow-xl',
                )}
              >
                <span className="block text-[10px] font-mono tracking-widest uppercase opacity-70">
                  BAŞVURU TAKİP KODUNUZ
                </span>
                <span className="block font-mono text-xl font-extrabold tracking-widest text-[#9E6F22] dark:text-[#D6AE5E]">
                  {trackingCode}
                </span>
              </div>

              <div className="pt-4 flex items-center justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'px-8 py-3 rounded-full text-xs font-sans font-extrabold tracking-wider uppercase transition-all duration-200 shadow-md',
                    isLight
                      ? 'bg-[#9E6F22] text-white hover:bg-[#855B19]'
                      : 'bg-[#D6AE5E] text-black hover:bg-[#C29B4B]',
                  )}
                >
                  TAMAMLA VE KAPAT
                </button>
              </div>
            </div>
          ) : (
            /* FORM STEPS */
            <form id="producer-form" onSubmit={handleSubmit} className="space-y-5">
              {/* STEP 1: PERSONAL & CONTACT */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-xs font-mono font-extrabold tracking-wider uppercase text-[#9E6F22] dark:text-[#D6AE5E]">
                    <User className="w-4 h-4" />
                    <span>01 — KİŞİSEL VE İLETİŞİM BİLGİLERİ</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider">
                        Ad Soyad *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Ahmet Yılmaz"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className={cn(
                          'w-full px-4 py-3 rounded-xl border text-xs font-medium focus:outline-none transition-all duration-200',
                          isLight
                            ? 'bg-white border-[#B8842F]/30 focus:border-[#9E6F22]'
                            : 'bg-black/60 border-white/20 focus:border-[#D6AE5E]',
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider">
                        T.C. Kimlik No *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        placeholder="11 haneli T.C. No"
                        value={formData.tcNo}
                        onChange={(e) => setFormData({ ...formData, tcNo: e.target.value })}
                        className={cn(
                          'w-full px-4 py-3 rounded-xl border text-xs font-medium focus:outline-none transition-all duration-200',
                          isLight
                            ? 'bg-white border-[#B8842F]/30 focus:border-[#9E6F22]'
                            : 'bg-black/60 border-white/20 focus:border-[#D6AE5E]',
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider">
                        Cep Telefonu *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="05XX XXX XX XX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={cn(
                          'w-full px-4 py-3 rounded-xl border text-xs font-medium focus:outline-none transition-all duration-200',
                          isLight
                            ? 'bg-white border-[#B8842F]/30 focus:border-[#9E6F22]'
                            : 'bg-black/60 border-white/20 focus:border-[#D6AE5E]',
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider">
                        Mahalle / Köy *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Arıl Mahallesi"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        className={cn(
                          'w-full px-4 py-3 rounded-xl border text-xs font-medium focus:outline-none transition-all duration-200',
                          isLight
                            ? 'bg-white border-[#B8842F]/30 focus:border-[#9E6F22]'
                            : 'bg-black/60 border-white/20 focus:border-[#D6AE5E]',
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: LAND & PRODUCTION DETAILS */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-xs font-mono font-extrabold tracking-wider uppercase text-[#9E6F22] dark:text-[#D6AE5E]">
                    <Tractor className="w-4 h-4" />
                    <span>02 — ARAZİ VE ÜRETİM DETAYLARI</span>
                  </div>

                  {/* Land Status Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider">
                      Arazi Mülkiyet Durumu *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'mulk', label: 'Şahsi Mülk' },
                        { id: 'kiralik', label: 'Kiralık / İntifa' },
                        { id: 'atil', label: 'Atıl Arazi' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, landStatus: item.id })}
                          className={cn(
                            'p-2.5 rounded-xl border text-xs font-bold transition-all duration-200 text-center',
                            formData.landStatus === item.id
                              ? isLight
                                ? 'border-[#9E6F22] bg-[#9E6F22] text-white shadow-md'
                                : 'border-[#D6AE5E] bg-[#D6AE5E] text-black shadow-md'
                              : isLight
                              ? 'border-[#B8842F]/30 bg-white text-[#1E1E1E]'
                              : 'border-white/20 bg-black/60 text-white',
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider">
                        Toplam Arazi Büyüklüğü (Dönüm) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Örn: 25 Dönüm"
                        value={formData.landSize}
                        onChange={(e) => setFormData({ ...formData, landSize: e.target.value })}
                        className={cn(
                          'w-full px-4 py-3 rounded-xl border text-xs font-medium focus:outline-none transition-all duration-200',
                          isLight
                            ? 'bg-white border-[#B8842F]/30 focus:border-[#9E6F22]'
                            : 'bg-black/60 border-white/20 focus:border-[#D6AE5E]',
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider">
                        Sulama Altyapısı Varmı?
                      </label>
                      <select
                        value={formData.hasIrrigation}
                        onChange={(e) => setFormData({ ...formData, hasIrrigation: e.target.value })}
                        className={cn(
                          'w-full px-4 py-3 rounded-xl border text-xs font-medium focus:outline-none transition-all duration-200',
                          isLight
                            ? 'bg-white border-[#B8842F]/30 focus:border-[#9E6F22]'
                            : 'bg-black/60 border-white/20 focus:border-[#D6AE5E]',
                        )}
                      >
                        <option value="evet">Evet (Kuyu / Şebeke / Damlama)</option>
                        <option value="hayir">Hayır (Kuru Tarım)</option>
                        <option value="destek_istiyorum">Sulama Desteği İstiyorum</option>
                      </select>
                    </div>
                  </div>

                  {/* Produce Type Multiple Selection */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold uppercase tracking-wider">
                      Üretilen / Üretilmesi Planlanan Mahsuller *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRODUCE_TYPES.map((prod) => {
                        const isSelected = formData.selectedProducts.includes(prod)
                        return (
                          <button
                            key={prod}
                            type="button"
                            onClick={() => handleProductToggle(prod)}
                            className={cn(
                              'px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5',
                              isSelected
                                ? isLight
                                  ? 'border-[#9E6F22] bg-[#9E6F22] text-white shadow-sm'
                                  : 'border-[#D6AE5E] bg-[#D6AE5E] text-black shadow-sm'
                                : isLight
                                ? 'border-[#B8842F]/30 bg-white text-[#333735]'
                                : 'border-white/20 bg-black/60 text-slate-300',
                            )}
                          >
                            <span>{prod}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: COOP & SUPPORT REQUESTS */}
              {step === 3 && (
                <div className="space-y-3.5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-xs font-mono font-extrabold tracking-wider uppercase text-[#9E6F22] dark:text-[#D6AE5E]">
                    <Award className="w-4 h-4" />
                    <span>03 — TALEPLER VE KOOPERATİF DESTEKLERİ</span>
                  </div>

                  <p className={cn('text-xs leading-relaxed', isLight ? 'text-[#333735]' : 'text-slate-300')}>
                    Şehitkamil Tarım Ekosistemi ve Şekabel Kooperatifi bünyesinde yararlanmak istediğiniz hizmetleri seçiniz:
                  </p>

                  <div className="space-y-2">
                    {SUPPORT_TYPES.map((sup) => {
                      const isSelected = formData.selectedSupports.includes(sup)
                      return (
                        <div
                          key={sup}
                          onClick={() => handleSupportToggle(sup)}
                          className={cn(
                            'p-3 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center justify-between gap-3',
                            isSelected
                              ? isLight
                                ? 'border-[#9E6F22] bg-[#9E6F22]/10 text-[#9E6F22]'
                                : 'border-[#D6AE5E] bg-[#D6AE5E]/10 text-[#D6AE5E]'
                              : isLight
                              ? 'border-[#B8842F]/20 bg-white hover:border-[#9E6F22]/50'
                              : 'border-white/10 bg-black/40 hover:border-[#D6AE5E]/50',
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Sprout className="w-4 h-4 shrink-0 text-[#9E6F22] dark:text-[#D6AE5E]" />
                            <span className="text-xs font-bold">{sup}</span>
                          </div>
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0',
                              isSelected
                                ? isLight
                                  ? 'border-[#9E6F22] bg-[#9E6F22] text-white'
                                  : 'border-[#D6AE5E] bg-[#D6AE5E] text-black'
                                : 'border-current/30',
                            )}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: VERIFICATION & SUMMARY */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-xs font-mono font-extrabold tracking-wider uppercase text-[#9E6F22] dark:text-[#D6AE5E]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>04 — BAŞVURU ÖZETİ VE ONAY</span>
                  </div>

                  {/* Summary Box */}
                  <div
                    className={cn(
                      'p-4 rounded-2xl border space-y-2.5 text-xs',
                      isLight ? 'bg-white border-[#B8842F]/30' : 'bg-black/60 border-white/15',
                    )}
                  >
                    <div className="flex justify-between border-b border-current/10 pb-2">
                      <span className="font-bold opacity-70">Ad Soyad:</span>
                      <span className="font-extrabold">{formData.fullName || 'Belirtilmedi'}</span>
                    </div>
                    <div className="flex justify-between border-b border-current/10 pb-2">
                      <span className="font-bold opacity-70">Telefon:</span>
                      <span className="font-extrabold">{formData.phone || 'Belirtilmedi'}</span>
                    </div>
                    <div className="flex justify-between border-b border-current/10 pb-2">
                      <span className="font-bold opacity-70">Mahalle / Köy:</span>
                      <span className="font-extrabold">{formData.neighborhood || 'Belirtilmedi'}</span>
                    </div>
                    <div className="flex justify-between border-b border-current/10 pb-2">
                      <span className="font-bold opacity-70">Arazi Büyüklüğü:</span>
                      <span className="font-extrabold">{formData.landSize || '0'} Dönüm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold opacity-70">Seçilen Mahsuller:</span>
                      <span className="font-extrabold text-right truncate max-w-[200px]">
                        {formData.selectedProducts.join(', ') || 'Tüm Ürünler'}
                      </span>
                    </div>
                  </div>

                  {/* KVKK Checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      required
                      checked={formData.kvkkConsent}
                      onChange={(e) => setFormData({ ...formData, kvkkConsent: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-[#9E6F22] accent-[#9E6F22]"
                    />
                    <span className={cn('text-[11px] leading-relaxed', isLight ? 'text-[#333735]' : 'text-slate-300')}>
                      KVKK Aydınlatma Metnini ve Çiftçi Ortaklık Taahhütnamesini okudum, T.C. Şehitkamil Belediyesi ve Şekabel Kooperatifi tarafından tarafımla iletişime geçilmesini onaylıyorum.
                    </span>
                  </label>
                </div>
              )}
            </form>
          )}
        </div>

        {/* PINNED MODAL FOOTER ACTION BAR (Always visible, never cut off) */}
        {!submitted && (
          <div
            className={cn(
              'p-4 sm:p-6 border-t flex items-center justify-between gap-3 relative z-20 backdrop-blur-md',
              isLight ? 'bg-[#FAF8F3]/95 border-[#B8842F]/20' : 'bg-[#060807]/95 border-white/15',
            )}
          >
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold uppercase transition-all',
                  isLight
                    ? 'border border-[#B8842F]/30 bg-white text-[#1E1E1E] hover:bg-slate-100'
                    : 'border border-white/20 bg-black/60 text-white hover:bg-white/10',
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>GERİ</span>
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition-all duration-200 shadow-md',
                  isLight
                    ? 'bg-[#9E6F22] text-white hover:bg-[#855B19]'
                    : 'bg-[#D6AE5E] text-black hover:bg-[#C29B4B]',
                )}
              >
                <span>SONRAKİ ADIM</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                form="producer-form"
                disabled={!formData.kvkkConsent}
                className={cn(
                  'inline-flex items-center gap-2 px-8 py-3 rounded-full text-xs font-extrabold tracking-wider uppercase transition-all duration-200 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed',
                  isLight
                    ? 'bg-[#9E6F22] text-white hover:bg-[#855B19]'
                    : 'bg-[#D6AE5E] text-black hover:bg-[#C29B4B]',
                )}
              >
                <span>BAŞVURUYU GÖNDER</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const ProducerModal = memo(ProducerModalComponent)
