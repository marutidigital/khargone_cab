// src/types/index.ts

export type Direction = 'KI' | 'IK'
export type DropPoint = 'rajendra' | 'railway' | 'airport' | 'bhawarkua' | 'rajwada'
export type BookingStatus = 'pending_payment' | 'waiting' | 'matched' | 'confirmed' | 'no_match_decision' | 'completed' | 'refunded' | 'cancelled'
export type VehicleType = 'sedan' | 'suv'

export interface DropOption {
  id: DropPoint
  name: string
  sub: string
  extra: number
}

export interface Booking {
  id: string
  booking_ref: string
  direction: Direction
  drop_point: DropPoint
  drop_name: string
  travel_date: string        // 'YYYY-MM-DD'
  pickup_time: string        // 'HH:MM'
  is_night: boolean
  base_fare: number
  discount: number
  night_extra: number
  total_fare: number
  passenger_name: string
  phone: string
  email?: string
  status: BookingStatus
  vehicle_type?: 'sedan' | 'suv' | 'innova'
  client_id?: string
  matched_with?: string
  whatsapp_sent: boolean
  email_sent: boolean
  advance_paid?: number
  payment_status?: string | null
  mode?: 'match' | 'guaranteed'
  passengers?: number
  passenger_count?: number
  advance_amount?: number
  balance_amount?: number
  cutoff_at?: string | null
  match_id?: string | null
  driver_id?: string | null
  driver_name?: string | null
  vehicle_model?: string | null
  created_at: string
  updated_at: string
}

export interface BookingFormData {
  direction: Direction
  drop_point: DropPoint
  travel_date: string
  pickup_time: string
  passenger_name: string
  phone: string
  email?: string
  consent: boolean
}

export interface PriceBreakdown {
  base: number
  extra: number
  distanceCharge: number
  chargeableDistanceKm: number
  routeDistanceKm: number
  kmRate: number
  tollEstimate: number
  discount: number
  night_extra: number
  same_day_extra?: number
  next_day_extra?: number
  total: number
}

export type BookingEventType =
  | 'page_view'
  | 'route_selected'
  | 'vehicle_selected'
  | 'date_selected'
  | 'details_filled'
  | 'payment_screen_reached'
  | 'whatsapp_clicked'

export interface BookingEvent {
  id: string
  created_at: string
  session_id: string
  event: BookingEventType
  direction?: Direction
  vehicle?: VehicleType
  point?: string
  travel_date?: string
  time_slot?: string
  price?: number
  phone?: string | null
  name?: string | null
  paid?: boolean
}

export interface WhatsAppMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export type LeadStage =
  | 'pay_clicked'
  | 'contacted'
  | 'replied'
  | 'confirmed'
  | 'completed'
  | 'no_response'
  | 'cancelled'

export interface Lead {
  id: string
  created_at: string
  booking_code?: string | null
  name: string | null
  phone: string
  direction: 'K2I' | 'I2K'
  vehicle: 'sedan' | 'suv' | string | null
  point: string | null
  pickup_at: string | null
  passengers: number | null
  base_fare?: number | null
  vehicle_extra?: number | null
  point_extra?: number | null
  night_extra?: number | null
  price: number | null
  stage: LeadStage
  source?: string | null
  is_known?: boolean
  consent_whatsapp?: boolean
  contacted_at?: string | null
  notes: string | null
}

export interface LeadEvent {
  id?: number
  created_at?: string
  session_id?: string | null
  event: string
  source?: string | null
  meta?: Record<string, any>
}

export interface AppPricingConfig {
  BASE: { K2I: number; I2K: number }
  STEP: number
  FLOOR: { K2I: number; I2K: number }
  SUV_EXTRA: number
  POINTS: Record<string, number>
  KM_CHARGE_PER_KM: number
  TOLL_ESTIMATE: number
  NIGHT_SURCHARGE: number
  MIN_LEAD_HOURS: number
  TRAVEL_HOURS: number
  ADVANCE: number
}

