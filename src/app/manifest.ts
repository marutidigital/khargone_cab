import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MarutiCab · Khargone Indore Private Cabs',
    short_name: 'MarutiCab',
    description: 'Book private economy sedans between Khargone and Indore with fixed pickup times and zero shared passengers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F4F5',
    theme_color: '#FBBF24',
    orientation: 'portrait',
    icons: [
      {
        src: '/economy_sedan.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/premium_suv.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
