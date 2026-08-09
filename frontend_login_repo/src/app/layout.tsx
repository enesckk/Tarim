import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/lib/lenis/LenisProvider";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Şehitkamil Tarım Ekosistemi — Sürdürülebilir Gelecek",
  description:
    "Yerli ve milli tohumdan toprağa can, ekonomiye kan, aileye imkan. Şehitkamil Belediyesi Dijital Tarım Dönüşümü.",
  keywords: [
    "Şehitkamil",
    "Tarım Ekosistemi",
    "AgroPark",
    "Şekabel Kooperatifi",
    "Dijital Tarım",
    "Gaziantep",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${cormorant.variable} ${outfit.variable} dark scroll-smooth`}>
      <body className="bg-brand-dark text-white font-sans antialiased selection:bg-brand-lime selection:text-brand-darker">
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}
