// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KC · Khargone Cabs',
  description: 'Shared cab service between Khargone and Indore. Safe, affordable, full AC Dzire.',
  keywords: 'khargone cab, indore cab, khargone to indore, shared taxi',
  openGraph: {
    title: 'KC · Khargone Cabs',
    description: 'Shared cab Khargone ↔ Indore. Book online, get matched instantly.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0C0C0B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
