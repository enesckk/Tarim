"use client";

import React from "react";

interface TimelineLeftProps {
  activeChapter: string;
  onNavigate: (id: string) => void;
}

export const TIMELINE_ITEMS = [
  { id: "baslangic", number: "01", label: "BAŞLANGIÇ" },
  { id: "analiz", number: "02", label: "ANALİZ" },
  { id: "vizyon", number: "03", label: "SÜREÇ" },
  { id: "uretim", number: "04", label: "ÜRETİM" },
  { id: "hasat", number: "05", label: "HASAT" },
  { id: "pazara", number: "06", label: "PAZARA" },
];

export default function TimelineLeft({ activeChapter, onNavigate }: TimelineLeftProps) {
  return (
    <div className="fixed left-8 lg:left-14 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col justify-between h-[500px] pointer-events-none">
      {/* Thin 2px Vertical Timeline Line */}
      <div className="relative flex flex-col gap-9 pointer-events-auto">
        <div className="absolute left-[4px] top-2 bottom-2 w-[2px] bg-white/10 -z-10" />

        {TIMELINE_ITEMS.map((item) => {
          const isActive =
            activeChapter === item.id ||
            (activeChapter === "basvuru" && item.id === "vizyon") ||
            (activeChapter === "dijital-takip" && item.id === "uretim") ||
            (activeChapter === "egitim" && item.id === "uretim");

          return (
            <div
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex items-center gap-4 cursor-pointer group"
            >
              {/* Stepper Dot - Gold for active, gray for inactive */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-[#D7B36A] shadow-[0_0_10px_rgba(215,179,106,0.6)] scale-125"
                      : "bg-[#A8A8A8]/40 border border-white/20 group-hover:bg-[#D7B36A]/60"
                  }`}
                />
              </div>

              {/* Number and Label */}
              <div className="flex flex-col text-left">
                <span
                  className={`text-[9px] font-mono tracking-widest leading-none ${
                    isActive ? "text-[#D7B36A] font-bold" : "text-[#A8A8A8]/50 group-hover:text-[#A8A8A8]"
                  }`}
                >
                  {item.number}
                </span>
                <span
                  className={`text-[10px] font-sans font-light tracking-[0.2em] leading-tight uppercase ${
                    isActive ? "text-[#D7B36A] font-semibold" : "text-[#A8A8A8]/60 group-hover:text-[#F5F5F5]"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mouse Scroll Indicator at Bottom — Continuous 2s Infinite Loop */}
      <div className="pointer-events-auto flex items-center gap-3.5 mt-8 opacity-75 hover:opacity-100 transition-opacity">
        <div className="w-5 h-9 rounded-full border border-white/25 flex items-start justify-center p-1">
          <div className="w-1 h-2 bg-[#D7B36A] rounded-full animate-mouse-dot shadow-[0_0_8px_rgba(215,179,106,0.8)]" />
        </div>
        <span className="text-[9px] font-sans font-light tracking-[0.25em] text-[#A8A8A8] uppercase">
          AŞAĞI KAYDIR
        </span>
      </div>
    </div>
  );
}
