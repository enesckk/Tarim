"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Sprout, MapPin, Send } from "lucide-react";
import { ApplicationFormData } from "@/types";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApplicationModal({ isOpen, onClose }: ModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<ApplicationFormData>({
    fullName: "",
    tcNo: "",
    phone: "",
    district: "Şehitkamil",
    neighborhood: "",
    adaNo: "",
    parselNo: "",
    landArea: "",
    cropType: "Domates (Şekabel)",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      // Auto-reset after demo submit
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl transition-all duration-300">
      <div className="relative w-full max-w-xl bg-brand-surface border border-brand-lime/30 rounded-3xl p-6 lg:p-8 shadow-glow-lg text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-12 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-lime/20 border border-brand-lime flex items-center justify-center text-brand-lime shadow-glow">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-white">
              Başvurunuz Başarıyla Alındı!
            </h3>
            <p className="text-sm text-slate-300 max-w-md">
              Talebiniz Ziraat Mühendislerimiz tarafından incelenerek 24 saat içinde tarafınızla iletişime geçilecektir. Takip numaranız:{" "}
              <span className="text-brand-lime font-mono font-bold">#ST-2026-8941</span>
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-4 px-6 py-2.5 rounded-full bg-brand-lime text-brand-darker font-bold text-xs uppercase tracking-wider hover:bg-brand-lime-hover transition-colors"
            >
              Tamam
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-[11px] font-semibold uppercase tracking-wider mb-2">
                <Sprout className="w-3.5 h-3.5" /> Dijital Üretici Kaydı
              </div>
              <h2 className="text-2xl font-serif font-bold text-white">
                Şehitkamil Tarım Destek Başvurusu
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Tohum, gübre, mekanizasyon ve uzman danışmanlık hibe paketlerinden faydalanın.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">
                  Ad Soyad
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ahmet Yılmaz"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-lime focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">
                  T.C. Kimlik No
                </label>
                <input
                  required
                  type="text"
                  maxLength={11}
                  placeholder="12345678901"
                  value={formData.tcNo}
                  onChange={(e) => setFormData({ ...formData, tcNo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-lime focus:outline-none transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">
                  Telefon
                </label>
                <input
                  required
                  type="tel"
                  placeholder="0532 000 0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-lime focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">
                  Mahalle / Köy
                </label>
                <input
                  required
                  type="text"
                  placeholder="Aktoprak Köyü"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-lime focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">
                  Ada / Parsel No
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    type="text"
                    placeholder="Ada"
                    value={formData.adaNo}
                    onChange={(e) => setFormData({ ...formData, adaNo: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-lime focus:outline-none font-mono"
                  />
                  <input
                    required
                    type="text"
                    placeholder="Parsel"
                    value={formData.parselNo}
                    onChange={(e) => setFormData({ ...formData, parselNo: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-lime focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-300 mb-1">
                  Arazi Büyüklüğü (Dönüm)
                </label>
                <input
                  required
                  type="number"
                  placeholder="25"
                  value={formData.landArea}
                  onChange={(e) => setFormData({ ...formData, landArea: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-lime focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
              >
                İptal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-lime text-brand-darker font-bold text-xs uppercase tracking-wider shadow-glow hover:bg-brand-lime-hover transition-all"
              >
                <span>Başvuruyu Tamamla</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
