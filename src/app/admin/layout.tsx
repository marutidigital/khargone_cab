// src/app/admin/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin · KC Khargone Cabs',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
      {children}
    </div>
  )
}
