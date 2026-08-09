"use client";

import React from "react";
import { GraduationCap, Play } from "lucide-react";

export default function Scene6Egitim() {
  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center bg-black">
      {/* Visual 2 Approved Scene Composition */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-black via-brand-green-deep/70 to-black">
        {/* Soft Golden Sunset Glow in background */}
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* Main Content Area — Matching Approved Visual 2 Exactly */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-8 lg:px-28 flex flex-col justify-center h-full pt-16">
        <div className="max-w-2xl pl-12 lg:pl-16">
          {/* Tag: 04 — EĞİTİM */}
          <div className="inline-flex items-center gap-2 text-brand-lime text-xs font-mono font-medium tracking-widest uppercase mb-4">
            <span>04 — EĞİTİM</span>
          </div>

          {/* Main Headline: Uygulamalı eğitimle üretimde bir adım önde. */}
          <h2 className="text-4xl sm:text-6xl lg:text-[62px] font-sans font-light text-white leading-[1.12] tracking-tight">
            Uygulamalı eğitimle <br />
            <span className="text-brand-lime font-medium">üretimde bir adım önde.</span>
          </h2>

          <div className="w-12 h-1 bg-brand-lime/60 my-6 rounded-full" />

          {/* Subtitle Description */}
          <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-lg">
            AgroPark'ta uzmanlarımızla birlikte tarımsal bilginizi pratiğe dönüştürün.
          </p>

          {/* Video Play Button: AgroPark Eğitim Tanıtımı (2:15 dk) */}
          <div className="mt-8 flex items-center gap-5">
            <button className="group flex items-center gap-4">
              <div className="w-14 h-14 rounded-full border border-brand-lime/40 bg-brand-surface/80 backdrop-blur-md flex items-center justify-center text-brand-lime group-hover:scale-105 transition-transform shadow-glow">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-sans font-semibold tracking-wider text-white uppercase">
                  AgroPark Eğitim Tanıtımı
                </span>
                <span className="text-[11px] font-mono tracking-widest text-slate-400 mt-0.5">
                  2:15 dk
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
