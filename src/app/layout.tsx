// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FBBF24',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://maruticab.in'),
  title: 'MarutiCab · Private Cab Khargone ↔ Indore',
  description: 'Book a private Economy Sedan between Khargone and Indore with clear fares and fixed pickup times.',
  keywords: 'private cab Khargone Indore, family car, Khargone to Indore taxi, book cab online',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MarutiCab',
  },
  openGraph: {
    title: 'MarutiCab · Private Cab Khargone ↔ Indore',
    description: 'Book a private cab Khargone ↔ Indore. Transparent pricing, no hidden charges.',
    type: 'website',
    url: 'https://maruticab.in',
    siteName: 'MarutiCab',
  },
  alternates: { canonical: '/' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#F4F4F5]">
      <body className="bg-[#F4F4F5] text-slate-900 antialiased min-h-screen selection:bg-amber-300">
        {children}
      </body>
    </html>
  )
}
