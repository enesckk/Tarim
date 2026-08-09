"use client";

import React, { useEffect, useRef } from "react";
import { Play } from "lucide-react";

export default function Scene1Baslangic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Floating cinematic dust particles in Golden Hour volumetric light
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.8,
        speedY: -(Math.random() * 0.25 + 0.05),
        speedX: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y < 0) p.y = height;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "#D7B36A";
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center bg-[#060807]">
      {/* Background Volumetric Golden Hour Light & Cinematic Haze */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#D8A441]/20 via-[#0A0D0A] to-[#060807]">
        {/* Golden Hour Light Ray Beam directly onto sprout from top-right */}
        <div className="absolute -top-10 right-0 w-[900px] h-[900px] bg-gradient-radial from-[#D7B36A]/25 via-[#D8A441]/5 to-transparent blur-[140px] opacity-80 pointer-events-none animate-sunlight-pulse" />

        {/* Floating Golden Dust Particle Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />

        {/* Right 65% Visual: Macro Seed Sprout Visual + Faint AI Data Network */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[65%] flex items-center justify-end pointer-events-none overflow-hidden">
          <div className="relative w-full h-full max-w-5xl animate-sprout-breath">
            {/* Photorealistic Sprout SVG */}
            <svg
              className="absolute right-10 lg:right-28 bottom-10 lg:bottom-20 w-[360px] sm:w-[520px] lg:w-[680px] h-[420px] lg:h-[720px]"
              viewBox="0 0 500 500"
            >
              <defs>
                <linearGradient id="goldenBeam" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#D8A441" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#060807" stopOpacity="0" />
                </linearGradient>

                {/* Very faint AI data network gradient - subtle low saturation olive/gold */}
                <linearGradient id="faintNetwork" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3E543E" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#D7B36A" stopOpacity="0.15" />
                </linearGradient>
              </defs>

              {/* Volumetric Sunbeam Cone */}
              <path d="M 500 0 L 120 500 L 420 500 Z" fill="url(#goldenBeam)" />

              {/* Faint, subtle AI Data Network under soil */}
              <g opacity="0.4">
                <path d="M 40 420 Q 200 390 460 460" fill="none" stroke="url(#faintNetwork)" strokeWidth="0.8" strokeDasharray="3 3" />
                <path d="M 70 450 Q 250 420 490 440" fill="none" stroke="url(#faintNetwork)" strokeWidth="1" />
                <path d="M 110 480 Q 290 440 500 490" fill="none" stroke="url(#faintNetwork)" strokeWidth="0.6" strokeDasharray="4 2" />

                {/* Faint network node dots */}
                <circle cx="190" cy="395" r="2.5" fill="#587358" />
                <circle cx="310" cy="425" r="3" fill="#D7B36A" className="animate-pulse" />
                <circle cx="410" cy="450" r="2" fill="#587358" />
              </g>

              {/* Macro Seed & Two Leaves Emerging from Moist Soil */}
              <g transform="translate(160, 60)">
                {/* Seed Husk */}
                <ellipse cx="140" cy="220" rx="46" ry="34" fill="#24170E" stroke="#8A5A2B" strokeWidth="1.5" transform="rotate(-18 140 220)" />
                {/* Stem */}
                <path d="M 155 200 C 140 140 160 80 230 40 C 230 40 210 100 175 180 Z" fill="#4B634B" stroke="#D7B36A" strokeWidth="0.8" />
                {/* Leaf 1 */}
                <path d="M 230 40 C 260 20 290 30 310 50 C 270 60 245 55 230 40 Z" fill="#6B8E6B" opacity="0.95" />
                {/* Leaf 2 */}
                <path d="M 210 70 C 240 60 270 70 285 90 C 255 95 230 90 210 70 Z" fill="#4E6D4E" opacity="0.9" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Left ~35% Composition Area - Apple Keynote Style */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-8 lg:px-24 flex flex-col justify-center h-full pt-16">
        <div className="max-w-xl pl-12 lg:pl-16">
          {/* Subtitle tag */}
          <p className="text-[11px] font-sans font-light tracking-[0.28em] text-[#D7B36A] uppercase mb-6">
            BİR TOHUM, BİR GELECEK
          </p>

          {/* Headline: 70-90px on Desktop, Light/Regular/Bold font mix */}
          <h1 className="text-4xl sm:text-6xl lg:text-[76px] font-sans font-extralight text-[#F5F5F5] leading-[1.1] tracking-tight">
            Yerli ve milli tohumdan <br />
            toprağa <span className="text-[#D7B36A] font-normal">can</span>, <br />
            ekonomiye <span className="text-[#D7B36A] font-normal">kan</span>, <br />
            aileye <span className="text-[#D7B36A] font-normal border-b border-[#D7B36A]/40 pb-0.5">imkan</span>.
          </h1>

          {/* Play Button - Glassmorphism, 105% hover scale + gold glow */}
          <div className="mt-12 flex items-center gap-5">
            <button className="group flex items-center gap-4.5 cursor-pointer">
              <div className="w-14 h-14 rounded-full glass-play-btn flex items-center justify-center text-[#D7B36A] group-hover:scale-105 group-hover:shadow-apple-glow transition-all duration-300">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-sans font-light tracking-[0.22em] text-[#F5F5F5] uppercase">
                  PROJEYİ İZLE
                </span>
                <span className="text-[10px] font-mono tracking-widest text-[#A8A8A8] uppercase mt-0.5">
                  90 SANİYE
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
