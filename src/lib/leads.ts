// src/lib/leads.ts
import { supabase } from '@/lib/supabase-client'
import type { Lead, LeadStage } from '@/types'

const SUBMIT_STORAGE_KEY = 'hanscab_submitted_leads'
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

export interface LeadSubmissionPayload {
  name: string
  phone: string
  direction: 'K2I' | 'I2K'
  vehicle: string
  point: string
  pickup_at: string
  passengers: number
  price: number
}

// 1. Check local storage for duplicate within 10 minutes
export function isDuplicateSubmission(phone: string, pickupAt: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(SUBMIT_STORAGE_KEY)
    if (!raw) return false
    const submits: Array<{ phone: string; pickup_at: string; time: number }> = JSON.parse(raw)
    const now = Date.now()
    const active = submits.filter(s => now - s.time < DUPLICATE_WINDOW_MS)
    localStorage.setItem(SUBMIT_STORAGE_KEY, JSON.stringify(active))
    return active.some(s => s.phone === phone && s.pickup_at === pickupAt)
  } catch {
    return false
  }
}

// 2. Record submission locally
export function markSubmissionLocally(phone: string, pickupAt: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(SUBMIT_STORAGE_KEY)
    const submits: Array<{ phone: string; pickup_at: string; time: number }> = raw ? JSON.parse(raw) : []
    submits.push({ phone, pickup_at: pickupAt, time: Date.now() })
    localStorage.setItem(SUBMIT_STORAGE_KEY, JSON.stringify(submits))
  } catch {
    // Ignore
  }
}

// 3. Insert lead into Supabase using anon key
export async function insertLead(payload: LeadSubmissionPayload): Promise<{
  success: boolean
  isDuplicate?: boolean
  error?: string
  data?: any
}> {
  // Check 1: Client local storage duplicate check
  if (isDuplicateSubmission(payload.phone, payload.pickup_at)) {
    return {
      success: true,
      isDuplicate: true,
    }
  }

  try {
    // Check 2: Database duplicate check for last 10 minutes
    const tenMinAgo = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', payload.phone)
      .eq('pickup_at', payload.pickup_at)
      .gte('created_at', tenMinAgo)
      .limit(1)

    if (existingLeads && existingLeads.length > 0) {
      markSubmissionLocally(payload.phone, payload.pickup_at)
      return {
        success: true,
        isDuplicate: true,
      }
    }

    // Insert new lead (anon key from client)
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: payload.name || null,
        phone: payload.phone,
        direction: payload.direction,
        vehicle: payload.vehicle,
        point: payload.point,
        pickup_at: payload.pickup_at,
        passengers: payload.passengers,
        price: payload.price,
        stage: 'pay_clicked',
      })
      .select()

    if (error) {
      console.error('Lead insertion error:', error)
      return { success: false, error: error.message }
    }

    markSubmissionLocally(payload.phone, payload.pickup_at)
    return { success: true, data }
  } catch (err: any) {
    console.error('Lead submission exception:', err)
    return { success: false, error: err.message || 'Unknown error' }
  }
}
