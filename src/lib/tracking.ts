// src/lib/tracking.ts
// Handles event logging to lead_events, UTM tracking, and Meta Pixel trigger

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server_session'
  let sid = sessionStorage.getItem('hanscab_session_id')
  if (!sid) {
    sid = 'sid_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36)
    try {
      sessionStorage.setItem('hanscab_session_id', sid)
    } catch {
      // Storage unavailable, ignore
    }
  }
  return sid
}

// 2. Read UTM parameters and persist in sessionStorage
export function initUTMTracking(): { utm_source?: string; utm_campaign?: string } {
  if (typeof window === 'undefined') return {}
  try {
    const params = new URLSearchParams(window.location.search)
    const sourceParam = params.get('utm_source')
    const campaignParam = params.get('utm_campaign')

    if (sourceParam) {
      sessionStorage.setItem('hanscab_utm_source', sourceParam)
    }
    if (campaignParam) {
      sessionStorage.setItem('hanscab_utm_campaign', campaignParam)
    }

    const storedSource = sessionStorage.getItem('hanscab_utm_source') || ''
    const storedCampaign = sessionStorage.getItem('hanscab_utm_campaign') || ''

    return {
      utm_source: storedSource || undefined,
      utm_campaign: storedCampaign || undefined,
    }
  } catch {
    return {}
  }
}

export function getStoredSource(): string {
  if (typeof window === 'undefined') return 'direct'
  try {
    const src = sessionStorage.getItem('hanscab_utm_source')
    const camp = sessionStorage.getItem('hanscab_utm_campaign')
    if (src && camp) return `${src}_${camp}`
    if (src) return src
    return 'direct'
  } catch {
    return 'direct'
  }
}

export interface TrackLeadEventPayload {
  event:
    | 'page_view'
    | 'direction_selected'
    | 'vehicle_selected'
    | 'point_selected'
    | 'date_selected'
    | 'time_selected'
    | 'details_filled'
    | 'pay_clicked'
    | 'whatsapp_clicked'
  source?: string
  meta?: Record<string, any>
}

// 3. Log event to /api/tracking -> lead_events
export async function logEvent(payload: TrackLeadEventPayload): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const sessionId = getSessionId()
    const source = payload.source || getStoredSource()

    // Meta Pixel trigger for 'pay_clicked'
    if (payload.event === 'pay_clicked') {
      try {
        if ((window as any).fbq) {
          ;(window as any).fbq('track', 'Lead', {
            content_name: 'Cab Booking Advance Intent',
            value: 500,
            currency: 'INR',
          })
        }
      } catch {
        // Meta pixel blocked by ad blocker, ignore
      }
    }

    fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        event: payload.event,
        source,
        meta: payload.meta || {},
      }),
      keepalive: true,
    }).catch(() => {})
  } catch (err) {
    console.warn('Tracking dispatch error:', err)
  }
}

export const logBookingEvent = logEvent
