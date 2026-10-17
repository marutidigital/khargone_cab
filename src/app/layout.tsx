// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hanscab · Private Cab Khargone ↔ Indore',
  description: 'Book private cab between Khargone and Indore. Transparent pricing, no hidden charges. Economy Sedan & Premium SUV available.',
  keywords: 'private cab Khargone Indore, family car, Khargone to Indore taxi, book cab online',
  openGraph: {
    title: 'Hanscab · Private Cab Khargone ↔ Indore',
    description: 'Book a private cab Khargone ↔ Indore. Transparent pricing, no hidden charges.',
    type: 'website',
    url: 'https://hanscab.in',
    siteName: 'Hanscab',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B1220',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0B1220] text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
