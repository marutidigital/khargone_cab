'use client'
// src/components/Toast.tsx

interface Props {
  msg: string
  type?: 'success' | 'error'
}

export function Toast({ msg, type = 'success' }: Props) {
  const bg    = type === 'error' ? 'var(--red)' : 'var(--text)'
  const color = type === 'error' ? '#fff' : 'var(--bg)'

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: bg,
      color,
      padding: '11px 20px',
      borderRadius: 30,
      fontSize: 12,
      fontWeight: 500,
      fontFamily: "'Geist Mono', monospace",
      zIndex: 999,
      whiteSpace: 'nowrap',
      maxWidth: '86vw',
      letterSpacing: '0.01em',
      animation: 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      <style>{`@keyframes toastIn{from{transform:translateX(-50%) translateY(60px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
      {msg}
    </div>
  )
}
