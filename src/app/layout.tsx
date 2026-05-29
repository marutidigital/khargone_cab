// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Khargone_Cab · Book Your Cab Online',
  description: 'Book a cab between Khargone and Indore. Transparent pricing, no hidden charges. Economy Sedan & Premium SUV available.',
  keywords: 'khargone cab, indore cab, khargone to indore, shared taxi, book cab online',
  openGraph: {
    title: 'Khargone_Cab · Book Your Cab Online',
    description: 'Book a cab Khargone ↔ Indore. Transparent pricing, no hidden charges.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFFFFF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
