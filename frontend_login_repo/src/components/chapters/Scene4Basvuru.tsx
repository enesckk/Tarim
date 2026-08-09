"use client";

import React from "react";
import { FileText, ArrowRight, CheckCircle2, Phone, ShieldCheck } from "lucide-react";

interface Scene4Props {
  onOpenModal: () => void;
}

export default function Scene4Basvuru({ onOpenModal }: Scene4Props) {
  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-brand-dark">
      {/* Background Graphic Ambient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-brand-dark via-brand-green-deep/30 to-brand-darker">
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-brand-lime/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* Main Chapter Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-16 flex flex-col justify-center h-full pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Text Block */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-surface/80 border border-brand-lime/30 text-brand-lime text-[11px] font-semibold uppercase tracking-widest mb-6 backdrop-blur-md">
              <FileText className="w-3.5 h-3.5" />
              04 — ÜRETİCİ BAŞVURU SÜRECİ
            </div>

            <h2 className="text-3xl sm:text-5xl font-serif font-semibold text-white leading-tight">
              Birkaç dakikada <br />
              <span className="text-brand-lime">dijital başvuru.</span>
            </h2>

            <p className="mt-5 text-sm sm:text-base text-slate-300 font-light leading-relaxed">
              Bürokrasi ve evrak kalabalığı yok. T.C. kimlik numaranız ve parsel bilginiz ile sistemimiz otomatik arazi doğrulaması gerçekleştirir.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={onOpenModal}
                className="inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-brand-lime text-brand-darker font-bold text-xs uppercase tracking-wider shadow-glow hover:bg-brand-lime-hover transition-all hover:scale-105"
              >
                <span>Hemen Başvuru Yap</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-brand-surface/60 border border-white/10 text-slate-300 text-xs">
                <Phone className="w-4 h-4 text-brand-gold" />
                <span>Çağrı Merkezi: 444 27 27</span>
              </div>
            </div>
          </div>

          {/* Right Visual Phone Application Card Sequence */}
          <div className="relative flex justify-center">
            {/* Phone Mockup Frame */}
            <div className="w-[300px] sm:w-[340px] bg-brand-surface rounded-[40px] border-4 border-slate-700 p-4 shadow-glow-lg text-white">
              {/* Phone Speaker Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-black" />
              </div>

              {/* Application Process Card List */}
              <div className="flex flex-col gap-3">
                <div className="p-3.5 rounded-2xl bg-brand-green-deep/80 border border-brand-lime/40 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-lime/20 text-brand-lime flex items-center justify-center text-xs font-bold font-mono">
                    1
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">T.C. Kimlik & Arazi Doğrulama</h5>
                    <p className="text-[10px] text-slate-400">E-Devlet entegrasyonu ile anında kontrol</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-brand-lime ml-auto" />
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center text-xs font-bold font-mono">
                    2
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">Destek Paketi Seçimi</h5>
                    <p className="text-[10px] text-slate-400">Tohum, gübre ve ekipman hibesi</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold font-mono">
                    3
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">Ziraat Mühendisi Ataması</h5>
                    <p className="text-[10px] text-slate-400">Ücretsiz saha danışmanı yönlendirmesi</p>
                  </div>
                </div>

                {/* Status footer pill */}
                <div className="mt-2 p-3 rounded-xl bg-brand-lime/10 border border-brand-lime/30 text-center">
                  <span className="text-[11px] font-semibold text-brand-lime uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    %100 BELEDİYE HİBE DESTEĞİ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
