"use client";

import React from "react";
import { CHAPTERS } from "@/data/chapters";
import {
  Home,
  Target,
  Eye,
  FileText,
  Activity,
  GraduationCap,
  Sprout,
  Wheat,
  ShoppingCart,
  ChevronDown,
} from "lucide-react";

interface SidebarProps {
  activeChapter: string;
  onNavigate: (id: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  Target,
  Eye,
  FileText,
  Activity,
  GraduationCap,
  Sprout,
  Wheat,
  ShoppingCart,
};

export default function Sidebar({ activeChapter, onNavigate }: SidebarProps) {
  const activeIndex = CHAPTERS.findIndex((c) => c.id === activeChapter);
  const progressPercentage = ((activeIndex + 1) / CHAPTERS.length) * 100;

  return (
    <aside
      aria-label="Proje Süreç Navigasyonu"
      className="fixed left-0 top-0 bottom-0 z-50 w-[280px] hidden lg:flex flex-col justify-between bg-brand-sidebar/95 backdrop-blur-xl border-r border-white/10 p-6 shadow-2xl transition-all duration-300"
    >
      {/* Top Header & Logo */}
      <div className="flex flex-col gap-6">
        <div
          onClick={() => onNavigate("baslangic")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Logo Hexagon Shield Icon */}
          <div className="w-12 h-12 rounded-xl bg-brand-green-deep border border-brand-lime/30 flex items-center justify-center shadow-glow group-hover:border-brand-lime transition-colors">
            <svg
              viewBox="0 0 40 40"
              className="w-7 h-7 text-brand-lime fill-current"
            >
              <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M20 10C20 10 14 16 14 22C14 25.3137 16.6863 28 20 28C23.3137 28 26 25.3137 26 22C26 16 20 10 20 10Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M20 15V25" stroke="currentColor" strokeWidth="1.5" />
              <path d="M17 20L20 23L23 20" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider text-white uppercase font-sans">
              ŞEHİTKAMİL
            </h1>
            <p className="text-[10px] tracking-widest text-brand-lime uppercase font-medium">
              TARIM EKOSİSTEMİ
            </p>
          </div>
        </div>

        {/* Vertical Progress Bar Track */}
        <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-gradient-to-r from-brand-gold to-brand-lime transition-all duration-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Navigation List */}
      <nav className="my-auto py-4 flex flex-col gap-1.5 relative">
        {CHAPTERS.map((chapter) => {
          const Icon = ICON_MAP[chapter.iconName] || Home;
          const isActive = activeChapter === chapter.id;

          return (
            <button
              key={chapter.id}
              onClick={() => onNavigate(chapter.id)}
              className={`group relative flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 text-left ${
                isActive
                  ? "bg-gradient-to-r from-brand-green-deep to-brand-surface text-brand-lime border border-brand-lime/40 shadow-glow"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {/* Active illuminated indicator border line */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-brand-lime rounded-r-full shadow-[0_0_10px_#8BF123]" />
              )}

              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-brand-lime/20 text-brand-lime"
                    : "text-slate-400 group-hover:text-brand-lime"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <span className="tracking-wider uppercase font-sans font-medium text-[11px] truncate">
                {chapter.title}
              </span>

              {/* Number tag */}
              <span className="ml-auto text-[10px] font-mono opacity-50">
                {chapter.number}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Scroll Hint Indicator */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <button
          onClick={() => {
            const nextIdx = (activeIndex + 1) % CHAPTERS.length;
            onNavigate(CHAPTERS[nextIdx].id);
          }}
          className="w-10 h-10 rounded-full border border-white/20 hover:border-brand-lime/60 flex items-center justify-center text-slate-300 hover:text-brand-lime transition-all duration-300 hover:scale-105"
          aria-label="Sonraki bölüme kaydır"
        >
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </button>

        <div className="flex flex-col text-right">
          <span className="text-[10px] text-slate-400 font-mono tracking-widest">
            {CHAPTERS[activeIndex]?.number} / 09
          </span>
          <span className="text-[9px] text-brand-gold uppercase tracking-wider font-semibold">
            {CHAPTERS[activeIndex]?.shortTitle}
          </span>
        </div>
      </div>
    </aside>
  );
}
