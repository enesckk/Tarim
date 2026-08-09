"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Header from "@/components/layout/Header";
import TimelineLeft from "@/components/layout/TimelineLeft";
import ApplicationModal from "@/components/ui/ApplicationModal";

import Scene1Baslangic from "@/components/chapters/Scene1Baslangic";
import Scene2Analiz from "@/components/chapters/Scene2Analiz";
import Scene3Vizyon from "@/components/chapters/Scene3Vizyon";
import Scene4Basvuru from "@/components/chapters/Scene4Basvuru";
import Scene5DijitalTakip from "@/components/chapters/Scene5DijitalTakip";
import Scene6Egitim from "@/components/chapters/Scene6Egitim";
import Scene7Uretim from "@/components/chapters/Scene7Uretim";
import Scene8Hasat from "@/components/chapters/Scene8Hasat";
import Scene9Pazara from "@/components/chapters/Scene9Pazara";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const [activeChapter, setActiveChapter] = useState<string>("baslangic");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // GSAP 100vh Fullscreen Parallax Transitions (700-900ms, cubic-bezier(0.22, 1, 0.36, 1))
  useEffect(() => {
    const sectionIds = [
      "baslangic",
      "analiz",
      "vizyon",
      "basvuru",
      "dijital-takip",
      "egitim",
      "uretim",
      "hasat",
      "pazara",
    ];

    const triggers: ScrollTrigger[] = [];

    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (!section) return;

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top 50%",
        end: "bottom 50%",
        onEnter: () => setActiveChapter(id),
        onEnterBack: () => setActiveChapter(id),
      });

      triggers.push(trigger);
    });

    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, []);

  // Smooth Lenis / Scroll to Chapter
  const handleNavigate = (id: string) => {
    setActiveChapter(id);
    const targetElement = document.getElementById(id);
    if (!targetElement) return;

    if ((window as any).lenis) {
      (window as any).lenis.scrollTo(targetElement, {
        duration: 0.85,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else {
      targetElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#060807] text-[#F5F5F5] selection:bg-[#D7B36A] selection:text-[#060807]">
      {/* Top Header */}
      <Header
        onOpenModal={() => setIsModalOpen(true)}
        onTabClick={handleNavigate}
      />

      {/* Left Timeline Stepper */}
      <TimelineLeft
        activeChapter={activeChapter}
        onNavigate={handleNavigate}
      />

      {/* Application Modal */}
      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Main Storyline */}
      <main ref={mainRef} className="relative w-full">
        <section id="baslangic" className="w-full h-screen snap-start">
          <Scene1Baslangic />
        </section>

        <section id="analiz" className="w-full h-screen snap-start">
          <Scene2Analiz />
        </section>

        <section id="vizyon" className="w-full h-screen snap-start">
          <Scene3Vizyon />
        </section>

        <section id="basvuru" className="w-full h-screen snap-start">
          <Scene4Basvuru onOpenModal={() => setIsModalOpen(true)} />
        </section>

        <section id="dijital-takip" className="w-full h-screen snap-start">
          <Scene5DijitalTakip />
        </section>

        <section id="egitim" className="w-full h-screen snap-start">
          <Scene6Egitim />
        </section>

        <section id="uretim" className="w-full h-screen snap-start">
          <Scene7Uretim />
        </section>

        <section id="hasat" className="w-full h-screen snap-start">
          <Scene8Hasat />
        </section>

        <section id="pazara" className="w-full h-screen snap-start">
          <Scene9Pazara onOpenModal={() => setIsModalOpen(true)} />
        </section>

        {/* Footer */}
        <footer className="w-full py-8 px-8 lg:px-16 border-t border-white/10 bg-[#060807] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#A8A8A8] font-sans tracking-wider">
          <p>© 2026 Şehitkamil Belediyesi. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#D7B36A] cursor-pointer transition-colors">Gizlilik Politikası</span>
            <span className="hover:text-[#D7B36A] cursor-pointer transition-colors">Kullanım Şartları</span>
            <span className="hover:text-[#D7B36A] cursor-pointer transition-colors">KVKK Aydınlatma Metni</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
