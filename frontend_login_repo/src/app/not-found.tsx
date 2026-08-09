import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-center text-white">
      <h2 className="text-4xl font-serif font-bold text-brand-lime">404</h2>
      <p className="mt-2 text-sm text-slate-300">Aradığınız sayfa bulunamadı.</p>
      <Link
        href="/"
        className="mt-6 px-6 py-2.5 rounded-full bg-brand-lime text-brand-darker font-bold text-xs uppercase tracking-wider hover:bg-brand-lime-hover transition-colors"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
