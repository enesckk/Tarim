"use client";

import React from "react";
import { Play } from "lucide-react";

export default function Scene7Uretim() {
  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-black">
      {/* Visual 1 Approved Scene Composition */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-black via-amber-950/40 to-black">
        {/* Golden Sunset Light Overlay from Horizon */}
        <div className="absolute top-1/3 right-1/4 w-[650px] h-[650px] bg-gradient-radial from-amber-400/25 via-amber-600/10 to-transparent blur-[140px] pointer-events-none" />

        {/* Farmers & Tractor Field Background Graphic representation */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-3/4 flex items-end justify-end pointer-events-none">
          <svg viewBox="0 0 1000 600" className="w-full h-full text-amber-500 opacity-90 object-cover">
            {/* Field Rows & Sunset Horizon */}
            <path d="M 0 450 Q 500 380 1000 480" fill="none" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="2" />
            <path d="M 0 500 Q 500 420 1000 540" fill="none" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="1.5" />

            {/* Tractor Silhouette Background Element */}
            <g transform="translate(420, 220)">
              <rect x="30" y="30" width="130" height="70" rx="8" fill="#141A15" stroke="#F59E0B" strokeWidth="2" />
              <rect x="50" y="0" width="70" height="40" rx="4" fill="rgba(245, 158, 11, 0.2)" stroke="#F59E0B" strokeWidth="1.5" />
              <circle cx="45" cy="100" r="32" fill="#0A0E0B" stroke="#F59E0B" strokeWidth="3" />
              <circle cx="45" cy="100" r="12" fill="#F59E0B" />
              <circle cx="155" cy="105" r="22" fill="#0A0E0B" stroke="#F59E0B" strokeWidth="2.5" />
            </g>
          </svg>
        </div>
      </div>

      {/* Main Content Area — Matching Approved Visual 1 Exactly */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-8 lg:px-28 flex flex-col justify-center h-full pt-16">
        <div className="max-w-xl pl-12 lg:pl-16">
          {/* Subtitle tag: 05 — ÜRETİM */}
          <p className="text-[11px] font-sans font-light tracking-[0.25em] text-amber-500 uppercase mb-4">
            05 — ÜRETİM
          </p>

          {/* Main Headline: Üretiyoruz, büyüyoruz. */}
          <h2 className="text-4xl sm:text-6xl lg:text-[64px] font-sans font-light text-white leading-[1.12] tracking-tight">
            Üretiyoruz, <br />
            <span className="text-amber-400 font-normal">büyüyoruz.</span>
          </h2>

          <div className="w-16 h-1 bg-amber-500/60 my-6 rounded-full" />

          {/* Play Video Trigger Button: SÜREÇ İZLE */}
          <div className="mt-8 flex items-center gap-5">
            <button className="group flex items-center gap-4">
              <div className="w-14 h-14 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-amber-400 group-hover:border-amber-400 group-hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <span className="text-xs font-sans font-light tracking-[0.25em] text-white uppercase">
                SÜREÇ İZLE
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
