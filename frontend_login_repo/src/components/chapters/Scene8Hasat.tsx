"use client";

import React from "react";
import { Wheat, Truck, PackageCheck, Award } from "lucide-react";

export default function Scene8Hasat() {
  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-brand-dark">
      {/* Background Harvest Crates Graphic */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-amber-900/40 via-brand-dark to-brand-darker">
        <div className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* Main Chapter Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-16 flex flex-col justify-center h-full pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Headline */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-surface/80 border border-brand-gold/40 text-brand-gold text-[11px] font-semibold uppercase tracking-widest mb-6 backdrop-blur-md">
              <Wheat className="w-3.5 h-3.5" />
              08 — BEREKETLİ HASAT
            </div>

            <h2 className="text-3xl sm:text-5xl font-serif font-semibold text-white leading-tight">
              Toprağın emeği, <br />
              <span className="text-brand-gold">kasalarda yerini alıyor.</span>
            </h2>

            <p className="mt-5 text-sm sm:text-base text-slate-300 font-light leading-relaxed">
              Düzgün ve hijyenik kasalama standartları ile toplanan domatesler, soğuk zincir lojistik araçlarımızla kooperatif işleme tesislerine sevk ediliyor.
            </p>

            <div className="mt-8 flex items-center gap-6">
              <div>
                <span className="text-3xl lg:text-4xl font-serif font-bold text-brand-gold">
                  14.200+
                </span>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
                  TON KALİTELİ HASAT
                </p>
              </div>

              <div className="h-10 w-[1px] bg-white/10" />

              <div>
                <span className="text-3xl lg:text-4xl font-serif font-bold text-brand-lime">
                  %100
                </span>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
                  ALIM GARANTİLİ
                </p>
              </div>
            </div>
          </div>

          {/* Right Harvest Crates Card */}
          <div className="relative flex justify-center">
            <div className="w-full max-w-md glass-panel-lime p-6 rounded-3xl border border-brand-gold/30 shadow-gold">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-brand-gold flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Soğuk Zincir Lojistik</h5>
                    <p className="text-[11px] text-slate-400">Tarladan Tesislerimize Direkt Sevk</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-brand-lime/20 text-brand-lime text-xs font-mono font-bold">
                  YOLDA
                </span>
              </div>

              {/* Harvest Metrics */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Toplanan Kasa Sayısı</span>
                  <span className="font-mono text-white font-bold">48.500 Adet</span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-gold w-[85%]" />
                </div>

                <div className="flex justify-between items-center text-xs pt-2">
                  <span className="text-slate-300">Şekabel Tesisi Teslimat</span>
                  <span className="font-mono text-brand-lime font-bold">Tamamlandı</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
