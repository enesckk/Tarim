"use client";

import React from "react";
import { Activity, Phone, Wifi, ShieldAlert, CheckCircle, Bell } from "lucide-react";

export default function Scene5DijitalTakip() {
  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-brand-dark">
      {/* Background Farmland Parallax Graphic */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-green-deep/50 via-brand-dark to-brand-darker">
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-brand-dark to-transparent z-10" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-16 flex flex-col justify-center h-full pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Text Block */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-surface/80 border border-brand-lime/30 text-brand-lime text-[11px] font-semibold uppercase tracking-widest mb-6 backdrop-blur-md">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              05 — DİJİTAL TAKİP VE UZMAN DESTEĞİ
            </div>

            <h2 className="text-3xl sm:text-5xl font-serif font-semibold text-white leading-tight">
              Tarlanız cebinizde, <br />
              <span className="text-brand-lime">uzmanınız yanınızda.</span>
            </h2>

            <p className="mt-5 text-sm sm:text-base text-slate-300 font-light leading-relaxed">
              Mobil uygulamamız ile toprağınızın nem seviyesinden sulama zamanına kadar her anı 7/24 canlı takip edin. Ziraat mühendislerimize tek tıkla canlı bağlanın.
            </p>

            {/* Live Indicator Badges */}
            <div className="mt-8 flex flex-col gap-3">
              <div className="glass-panel p-3.5 rounded-xl border border-brand-lime/30 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-brand-lime animate-ping" />
                <span className="text-xs font-mono text-white">
                  CANLI SENSOR BAĞLANTISI: 12 ADET AKTİF IOT İSTASYONU
                </span>
              </div>

              <div className="glass-panel p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
                <Wifi className="w-4 h-4 text-brand-gold" />
                <span className="text-xs font-mono text-slate-300">
                  ZİRAAT MÜHENDİSİ DANIŞMA HATTI: 7/24 KESİNTİSİZ
                </span>
              </div>
            </div>
          </div>

          {/* Right Interactive Phone App Screen */}
          <div className="relative flex justify-center">
            {/* Illuminated Device Frame */}
            <div className="w-[310px] sm:w-[360px] bg-brand-surface rounded-[44px] border-4 border-brand-lime/40 p-4 shadow-glow-lg text-white">
              {/* App Top Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-lime animate-pulse" />
                  <span className="text-[11px] font-mono font-bold text-brand-lime">
                    ŞEHİTKAMİL MOBİL
                  </span>
                </div>
                <Bell className="w-4 h-4 text-slate-400" />
              </div>

              {/* Task Cards inside Phone */}
              <div className="flex flex-col gap-3">
                {/* Task 1 */}
                <div className="p-3.5 rounded-2xl bg-brand-green-deep border border-brand-lime/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Toprak Nem Seviyesi</span>
                    <span className="text-[10px] font-mono text-brand-lime font-bold">%68 (Ideal)</span>
                  </div>
                  <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-lime w-[68%]" />
                  </div>
                </div>

                {/* Task 2 */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="text-xs font-semibold text-white">Gübreleme Zamanı</h6>
                      <p className="text-[10px] text-slate-400">Yarın Sabah 07:00</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-mono font-bold">
                      Planlandı
                    </span>
                  </div>
                </div>

                {/* Task 3 */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="text-xs font-semibold text-white">Uzman Ziraat Mühendisi</h6>
                      <p className="text-[10px] text-slate-400">Dr. Selin Kaya (Çevrimiçi)</p>
                    </div>
                    <button className="px-3 py-1 rounded-full bg-brand-lime text-brand-darker font-bold text-[10px]">
                      Görüş
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
