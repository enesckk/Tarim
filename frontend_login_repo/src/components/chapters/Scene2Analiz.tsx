"use client";

import React from "react";
import { Target, Layers, Cpu, CheckCircle } from "lucide-react";

export default function Scene2Analiz() {
  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-brand-dark">
      {/* Background Satellite Parcel Grid Graphic */}
      <div className="absolute inset-0 z-0 bg-brand-darker opacity-95">
        {/* Top-down Satellite Scanning Lines Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        {/* Dynamic Scanning Radar Sweep Beam */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-lime/10 to-transparent h-48 animate-scan pointer-events-none" />

        {/* Central Parcel SVG Graphic */}
        <div className="absolute right-8 lg:right-24 top-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] lg:w-[600px] h-[360px] lg:h-[500px]">
          <svg viewBox="0 0 600 500" className="w-full h-full text-brand-lime">
            {/* Grid Coordinates */}
            <g opacity="0.3" stroke="#8BF123" strokeWidth="0.5" fill="none">
              <line x1="50" y1="50" x2="550" y2="50" />
              <line x1="50" y1="150" x2="550" y2="150" />
              <line x1="50" y1="250" x2="550" y2="250" />
              <line x1="50" y1="350" x2="550" y2="350" />
              <line x1="50" y1="450" x2="550" y2="450" />
            </g>

            {/* Targeted Parcel Path */}
            <path
              d="M 120 120 L 450 100 L 520 380 L 180 420 Z"
              fill="rgba(139, 241, 35, 0.08)"
              stroke="#8BF123"
              strokeWidth="2.5"
              strokeDasharray="8 4"
              className="animate-pulse"
            />

            {/* Parcel Corners & Nodes */}
            <circle cx="120" cy="120" r="6" fill="#8BF123" />
            <circle cx="450" cy="100" r="6" fill="#8BF123" />
            <circle cx="520" cy="380" r="6" fill="#8BF123" />
            <circle cx="180" cy="420" r="6" fill="#8BF123" />

            {/* Center Analysis Crosshair Target */}
            <g transform="translate(320, 250)">
              <circle r="40" fill="none" stroke="#8BF123" strokeWidth="1" opacity="0.4" />
              <circle r="20" fill="none" stroke="#8BF123" strokeWidth="1.5" className="animate-ping" />
              <line x1="-50" y1="0" x2="50" y2="0" stroke="#8BF123" strokeWidth="1" />
              <line x1="0" y1="-50" x2="0" y2="50" stroke="#8BF123" strokeWidth="1" />
              <circle r="4" fill="#8BF123" />
            </g>
          </svg>

          {/* Telemetry Live Data Badges floating over parcel */}
          <div className="absolute top-12 left-4 glass-panel px-3.5 py-2 rounded-xl border border-brand-lime/30 text-white flex items-center gap-2 text-[11px] font-mono shadow-glow">
            <span className="w-2 h-2 rounded-full bg-brand-lime animate-ping" />
            <span>ADA/PARSEL: 104 / 12</span>
          </div>

          <div className="absolute bottom-16 right-4 glass-panel px-3.5 py-2 rounded-xl border border-brand-gold/30 text-brand-gold flex items-center gap-2 text-[11px] font-mono">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>TOPRAK DEĞERİ: %94 VERİMLİ</span>
          </div>
        </div>
      </div>

      {/* Main Chapter Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-16 flex flex-col justify-center h-full pt-16">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-surface/80 border border-brand-lime/30 text-brand-lime text-[11px] font-semibold uppercase tracking-widest mb-6 backdrop-blur-md">
            <Target className="w-3.5 h-3.5" />
            02 — UYDU VE PARSEL ANALİZİ
          </div>

          <h2 className="text-3xl sm:text-5xl font-serif font-semibold text-white leading-tight">
            Toprağın röntgenini <br />
            <span className="text-brand-lime">uzaydan çekiyoruz.</span>
          </h2>

          <p className="mt-5 text-sm sm:text-base text-slate-300 font-light leading-relaxed">
            Yüksek çözünürlüklü spektrometre uydularımız ile Şehitkamil ilçemizdeki tüm tarım arazilerinin nem, mineral, Ph ve rekolte potansiyelini anlık haritalandırıyoruz.
          </p>

          {/* Key Metric Highlights */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-brand-lime/10 text-brand-lime">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-mono font-bold text-white">42.000+</h4>
                <p className="text-[11px] text-slate-400">Taranan Parsel Sayısı</p>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-brand-gold/10 text-brand-gold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-mono font-bold text-white">%99.2</h4>
                <p className="text-[11px] text-slate-400">Analiz Doğruluk Oranı</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
