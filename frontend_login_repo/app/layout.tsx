import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Şehitkamil Tarım Ekosistemi • Strateji ve Geliştirme Merkezi',
  description:
    'Atıl araziler, üretimin geleceğine dönüşüyor. Yerli ve milli tohumdan sofralara uzanan sinematik tarım ekosistemi deneyimi.',
  generator: 'v0.app',
  icons: {
    icon: '/logo/sehitkamil-logo-dark.png',
    apple: '/logo/sehitkamil-logo-dark.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0e0a',
  userScalable: false,
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={`dark bg-black ${inter.variable} ${playfair.variable}`}>
      <head>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <link key={n} rel="preload" as="image" href={`/chapters/${n}.png`} />
        ))}
      </head>
      <body className="antialiased font-sans">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
