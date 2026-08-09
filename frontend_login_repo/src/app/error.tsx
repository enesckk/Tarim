"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-center text-white">
      <h2 className="text-2xl font-serif font-bold text-brand-lime">Bir Hata Oluştu</h2>
      <p className="mt-2 text-sm text-slate-300">Lütfen sayfayı yenilemeyi deneyin.</p>
      <button
        onClick={() => reset()}
        className="mt-6 px-6 py-2.5 rounded-full bg-brand-lime text-brand-darker font-bold text-xs uppercase tracking-wider hover:bg-brand-lime-hover transition-colors"
      >
        Tekrar Dene
      </button>
    </div>
  );
}
