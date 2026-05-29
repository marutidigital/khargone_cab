'use client'
// src/components/FooterTicker.tsx

const ITEMS = [
  { bold: 'Khargone_Cab', text: ' · Transparent · Reliable · Hassle-Free' },
  { bold: '', text: 'No Driver Allowance' },
  { bold: '', text: 'No Toll Charges' },
  { bold: '', text: 'No Parking Charges' },
  { bold: '', text: 'Everything Included' },
]

export function FooterTicker() {
  // Duplicate for seamless loop
  const allItems = [...ITEMS, ...ITEMS]

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 40,
      background: '#111',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      zIndex: 100,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        animation: 'ticker 28s linear infinite',
        whiteSpace: 'nowrap',
        willChange: 'transform',
      }}>
        {allItems.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#CCC', letterSpacing: '0.02em' }}>
              {item.bold && <strong style={{ color: '#FFC107', fontWeight: 700 }}>{item.bold}</strong>}
              {item.text}
            </span>
            <span style={{
              display: 'inline-block',
              width: 4, height: 4, borderRadius: '50%',
              background: '#FFC107',
              margin: '0 28px',
              flexShrink: 0,
            }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
