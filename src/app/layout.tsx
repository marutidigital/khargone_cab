// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

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
    <html lang="en" className={`${inter.className} bg-[#F4F4F5]`}>
      <head>
        {/* Google Tag Manager */}
        <script async src="https://www.googletagmanager.com/gtm.js?id=GTM-WKGZ7C96" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
            `,
          }}
        />

        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1487132109976960');
fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1487132109976960&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body className="bg-[#F4F4F5] text-slate-900 antialiased min-h-screen selection:bg-amber-300">
        {/* Google Tag Manager (noscript fallback) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WKGZ7C96"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </html>
  )
}
