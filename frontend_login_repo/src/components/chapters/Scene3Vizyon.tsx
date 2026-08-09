"use client";

import React from "react";
import { Eye, ChevronDown, Leaf, TrendingUp, ShieldCheck } from "lucide-react";

export default function Scene3Vizyon() {
  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-brand-dark">
      {/* Background Sunrise Agricultural Valley & Green Grid Overlay */}
      <div className="absolute inset-0 z-0">
        {/* Soft Golden Sunrise Gradient Ambient */}
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-amber-600/30 via-emerald-950/40 to-brand-dark z-10 pointer-events-none" />

        {/* Sunlight Orb Glow */}
        <div className="absolute top-10 right-20 w-[500px] h-[500px] bg-amber-400/20 rounded-full blur-[120px] z-10 pointer-events-none" />

        {/* Dynamic Digital Green Parcel Grid Lines SVG */}
        <svg
          viewBox="0 0 1200 800"
          className="absolute inset-0 w-full h-full object-cover z-20 text-brand-lime opacity-80"
        >
          <defs>
            <linearGradient id="gridGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8BF123" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8BF123" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Greenhouse Structure Glowing Box */}
          <polygon
            points="680,480 920,460 980,560 720,590"
            fill="rgba(139, 241, 35, 0.12)"
            stroke="url(#gridGlow)"
            strokeWidth="2"
            className="animate-pulse"
          />

          {/* Connected Grid Polygon Fields */}
          <polygon points="500,520 660,490 700,580 540,620" fill="rgba(139, 241, 35, 0.05)" stroke="#8BF123" strokeWidth="1.5" />
          <polygon points="730,595 990,565 1060,680 790,720" fill="rgba(139, 241, 35, 0.08)" stroke="#8BF123" strokeWidth="1.5" />

          {/* Pulsing Connected Node Points */}
          <circle cx="680" cy="480" r="5" fill="#8BF123" />
          <circle cx="920" cy="460" r="5" fill="#8BF123" />
          <circle cx="980" cy="560" r="5" fill="#8BF123" />
          <circle cx="720" cy="590" r="5" fill="#8BF123" />

          {/* Floating Icon Badges on Nodes */}
          <g transform="translate(670, 440)">
            <circle r="14" fill="#0F1411" stroke="#8BF123" strokeWidth="1.5" />
            <path d="M-5 -2 L0 4 L6 -4" fill="none" stroke="#8BF123" strokeWidth="1.5" />
          </g>
          <g transform="translate(770, 420)">
            <circle r="14" fill="#0F1411" stroke="#C5A059" strokeWidth="1.5" />
            <path d="M-4 3 L4 -3" fill="none" stroke="#C5A059" strokeWidth="1.5" />
          </g>
          <g transform="translate(870, 410)">
            <circle r="14" fill="#0F1411" stroke="#8BF123" strokeWidth="1.5" />
          </g>
        </svg>
      </div>

      {/* Main Chapter Content — Exact Match to Image 1 */}
      <div className="relative z-30 w-full max-w-7xl mx-auto px-6 lg:px-16 flex flex-col justify-center h-full pt-16">
        <div className="max-w-2xl">
          {/* Main Headline */}
          <h2 className="text-4xl sm:text-6xl font-serif font-medium text-white leading-[1.12] tracking-tight">
            Atıl araziler, <br />
            üretimin geleceğine <br />
            <span className="text-brand-lime font-serif italic">dönüşüyor.</span>
          </h2>

          <div className="w-16 h-1 bg-brand-gold/60 my-8 rounded-full" />

          {/* Three Key Pillar Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-brand-surface border border-white/10 text-brand-lime shrink-0">
                <Leaf className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Atıl Arazileri</span>
                <span className="text-[11px] text-slate-300 font-light">Üretime Kazandırıyoruz</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-brand-surface border border-white/10 text-brand-gold shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Üreticiyi</span>
                <span className="text-[11px] text-slate-300 font-light">Güçlendiriyoruz</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-brand-surface border border-white/10 text-brand-lime shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Sürdürülebilir</span>
                <span className="text-[11px] text-slate-300 font-light">Gelecek İnşa Ediyoruz</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Bottom Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto">
          <div className="w-6 h-10 rounded-full border-2 border-brand-lime/40 flex items-center justify-center p-1 shadow-glow">
            <div className="w-1.5 h-3 bg-brand-lime rounded-full animate-bounce" />
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
            AŞAĞI KAYDIR
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-brand-lime animate-bounce" />
        </div>
      </div>
    </section>
  );
}
