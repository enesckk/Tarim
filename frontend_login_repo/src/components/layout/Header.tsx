"use client";

import React from "react";

interface HeaderProps {
  onOpenModal: () => void;
  onTabClick?: (tab: string) => void;
}

export default function Header({ onOpenModal, onTabClick }: HeaderProps) {
  const navItems = [
    { label: "PROJE", id: "baslangic" },
    { label: "SÜREÇ", id: "analiz" },
    { label: "ÜRETİCİ UYGULAMASI", id: "uretim" },
    { label: "YÖNETİM SİSTEMİ", id: "pazara" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-8 lg:px-12 py-6 flex items-center justify-between pointer-events-none bg-gradient-to-b from-[#060807]/90 via-[#060807]/40 to-transparent">
      {/* Top Left Logo - Small, spacious, thin gold lines */}
      <div
        onClick={() => onTabClick && onTabClick("baslangic")}
        className="flex items-center gap-3.5 pointer-events-auto cursor-pointer group"
      >
        <div className="w-10 h-10 border border-[#D7B36A]/30 rounded-xl bg-[#0A0D0A]/70 backdrop-blur-md flex items-center justify-center group-hover:border-[#D7B36A] transition-colors">
          <svg viewBox="0 0 40 40" className="w-5 h-5 text-[#D7B36A] fill-current">
            <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M20 10C20 10 14 16 14 22C14 25.3137 16.6863 28 20 28C23.3137 28 26 25.3137 26 22C26 16 20 10 20 10Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M20 15V25" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-light tracking-[0.22em] text-[#F5F5F5] uppercase font-sans">
            ŞEHİTKAMİL
          </span>
          <span className="text-[9px] tracking-[0.28em] text-[#D7B36A]/80 uppercase font-sans font-normal">
            TARIM EKOSİSTEMİ
          </span>
        </div>
      </div>

      {/* Top Center Navigation Links - 13-15px, subtle gold underline hover */}
      <nav className="hidden md:flex items-center gap-10 pointer-events-auto">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onTabClick && onTabClick(item.id)}
            className="group relative text-[13px] font-sans font-normal tracking-[0.18em] uppercase text-[#A8A8A8] hover:text-[#F5F5F5] transition-colors duration-300 py-1"
          >
            <span>{item.label}</span>
            <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#D7B36A] transition-all duration-300 group-hover:w-full" />
          </button>
        ))}
      </nav>

      {/* Top Right CTA Button - Thin outline pill, hollow inside, gold fill on hover */}
      <div className="pointer-events-auto">
        <button
          onClick={onOpenModal}
          className="group flex items-center gap-2.5 px-5 py-2 rounded-full border border-[#D7B36A]/40 bg-transparent text-[#F5F5F5] hover:text-[#060807] hover:bg-[#D7B36A] transition-all duration-300 shadow-sm"
        >
          <span className="text-[12px] font-sans font-normal tracking-[0.15em] uppercase">
            ÜRETİCİ BAŞVURUSU
          </span>
          <span className="text-xs transition-transform group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>
    </header>
  );
}
