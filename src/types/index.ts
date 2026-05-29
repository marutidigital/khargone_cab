// src/types/index.ts

export type Direction = 'KI' | 'IK'
export type DropPoint = 'rajendra' | 'railway' | 'airport'
export type BookingStatus = 'waiting' | 'confirmed' | 'cancelled'

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
  matched_with?: string
  whatsapp_sent: boolean
  email_sent: boolean
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
}

export interface PriceBreakdown {
  base: number
  extra: number
  discount: number
  night_extra: number
  total: number
}

export interface WhatsAppMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
