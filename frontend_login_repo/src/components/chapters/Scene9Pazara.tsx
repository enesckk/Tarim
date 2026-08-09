"use client";

import React from "react";
import { ShoppingCart, Play, CheckCircle2, ArrowRight, Star } from "lucide-react";

interface Scene9Props {
  onOpenModal: () => void;
}

export default function Scene9Pazara({ onOpenModal }: Scene9Props) {
  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-brand-dark">
      {/* Background Sunset Warm Wooden Table Tabletop & Cooperative Scene */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-brand-dark via-amber-950/50 to-brand-darker">
        {/* Soft Sunset Light Beam on Product Jar */}
        <div className="absolute top-1/4 right-1/4 w-[550px] h-[550px] bg-gradient-radial from-amber-500/25 via-red-600/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* Main Chapter Content — Matching Image 2 Reference */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-16 flex flex-col justify-center h-full pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Text & CTA */}
          <div>
            {/* Chapter Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-surface/80 border border-brand-gold/40 text-brand-gold text-[11px] font-semibold uppercase tracking-widest mb-6 backdrop-blur-md">
              <ShoppingCart className="w-3.5 h-3.5" />
              09 — PAZARA
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl sm:text-6xl font-serif font-medium text-white leading-[1.12] tracking-tight">
              Değerimiz <br />
              <span className="text-brand-gold italic">sofralara ulaşıyor.</span>
            </h2>

            <div className="w-16 h-1 bg-brand-gold/60 my-6 rounded-full" />

            <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-md">
              Şekabel Kooperatifi güvencesiyle, katkısız ve %100 doğal olarak işlenen taze domatesler sofralara bereket taşıyor.
            </p>

            {/* Watch Market Path Video Button */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button className="group inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-brand-surface border border-brand-gold/40 hover:border-brand-gold text-white font-sans font-semibold text-xs uppercase tracking-wider shadow-gold transition-all duration-300">
                <div className="w-8 h-8 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
                <span>PAZARA GİDEN YOLU İZLE</span>
              </button>

              <button
                onClick={onOpenModal}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-brand-lime text-brand-darker font-bold text-xs uppercase tracking-wider shadow-glow hover:bg-brand-lime-hover transition-all hover:scale-105"
              >
                <span>ÜRETİCİ OLARAK KATIL</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Product Hero Card — ŞEKABEL DOMATES KONSERVESİ */}
          <div className="relative flex justify-center">
            {/* Wooden Tabletop Jar Showcase Container */}
            <div className="relative w-[320px] sm:w-[380px] bg-gradient-to-b from-brand-surface to-brand-green-deep p-6 rounded-[36px] border border-brand-gold/40 shadow-gold text-white flex flex-col items-center text-center group hover:scale-[1.02] transition-transform duration-500">
              {/* Top Rating & Badge */}
              <div className="w-full flex items-center justify-between border-b border-white/10 pb-3 mb-6">
                <span className="text-[11px] font-mono font-bold text-brand-gold tracking-widest">
                  ŞEKABEL KOOPERATİFİ
                </span>
                <div className="flex items-center gap-1 text-amber-400 text-xs">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="font-mono font-bold">5.0</span>
                </div>
              </div>

              {/* Product Jar Visual Representation */}
              <div className="relative my-4 w-48 h-64 flex flex-col items-center justify-center">
                {/* Glass Jar Body SVG */}
                <svg viewBox="0 0 200 280" className="w-full h-full text-brand-gold">
                  {/* Glass Jar Glow */}
                  <rect x="30" y="40" width="140" height="210" rx="20" fill="rgba(180, 40, 20, 0.85)" stroke="#C5A059" strokeWidth="3" />
                  {/* Metal Lid */}
                  <rect x="40" y="20" width="120" height="25" rx="5" fill="#C5A059" stroke="#E5C479" strokeWidth="2" />

                  {/* Label Paper Banner */}
                  <rect x="40" y="90" width="120" height="110" rx="4" fill="#F4EFE6" stroke="#4A3423" strokeWidth="1" />
                  <text x="100" y="120" textAnchor="middle" fill="#1C2B20" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                    ŞEKABEL
                  </text>
                  <text x="100" y="136" textAnchor="middle" fill="#4A3423" fontSize="8" fontWeight="bold">
                    DOMATES KONSERVESİ
                  </text>

                  {/* Tomato Illustration on Label */}
                  <circle cx="100" cy="160" r="14" fill="#D32F2F" />
                  <path d="M96 148 Q 100 144 104 148" fill="none" stroke="#2E7D32" strokeWidth="2" />

                  <text x="100" y="186" textAnchor="middle" fill="#1C2B20" fontSize="8" fontWeight="semibold">
                    %100 DOĞAL • 700 g
                  </text>
                </svg>

                {/* Fresh Tomatoes around Jar */}
                <div className="absolute -bottom-2 -left-4 w-12 h-12 rounded-full bg-red-600 border border-amber-500/40 shadow-lg" />
                <div className="absolute -bottom-2 -right-4 w-14 h-14 rounded-full bg-red-700 border border-amber-500/40 shadow-lg" />
              </div>

              {/* Bottom Guarantee Banner */}
              <div className="mt-4 w-full p-3 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-gold" />
                <span className="text-[11px] font-semibold text-brand-gold uppercase tracking-wider">
                  DOĞADAN SOFRANIZA GÜVENCE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
