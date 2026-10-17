// src/lib/tracking.ts

import type { BookingEventType, Direction, VehicleType } from '@/types'

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server_session'
  let sid = sessionStorage.getItem('hanscab_session_id')
  if (!sid) {
    sid = 'sid_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36)
    try {
      sessionStorage.setItem('hanscab_session_id', sid)
    } catch {
      // Storage unavailable, ignore
    }
  }
  return sid
}

export interface TrackPayload {
  event: BookingEventType
  direction?: Direction
  vehicle?: VehicleType
  point?: string
  travel_date?: string
  time_slot?: string
  price?: number
  phone?: string | null
  name?: string | null
  consent?: boolean
}

export async function logBookingEvent(payload: TrackPayload): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const sessionId = getSessionId()
    const body = {
      session_id: sessionId,
      ...payload,
    }

    // Call /api/tracking
    fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true, // Allows fetch to complete even on page leave
    }).catch((err) => {
      console.warn('Analytics event skipped:', err)
    })
  } catch (err) {
    // Analytics should never disrupt user experience
    console.warn('Tracking dispatch error:', err)
  }
}
