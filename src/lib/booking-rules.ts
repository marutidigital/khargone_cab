// src/lib/booking-rules.ts
// Dynamic Booking Rules Engine for MarutiCab (Khargone ↔ Indore)
// Fetches rules from Supabase booking_rules and booking_rule_versions.

import { createServiceClient } from '@/lib/supabase-server'

export interface BookingRuleRecord {
  id: string
  rule_code: 'SAME_DAY' | 'ONE_DAY' | 'ADVANCE_2_PLUS' | string
  rule_name: string
  min_hours_before_departure: number
  max_hours_before_departure: number | null
  matching_deadline_hours: number
  advance_amount: number
  refund_enabled: boolean
  auto_cancel_on_no_match: boolean
  active: boolean
  priority: number
  timezone: string
  description: string | null
  customer_message: string | null
}

export interface RuleEvaluationResult {
  ruleCode: string
  ruleName: string
  ruleId: string
  remainingHours: number
  matchingDeadline: Date
  matchingDeadlineKolkata: string
  advanceAmount: number
  canAcceptPending: boolean
  rejectionReason?: string
  ruleSnapshot: Record<string, unknown>
  customerExplanation: string
}

const DEFAULT_RULES: BookingRuleRecord[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    rule_code: 'SAME_DAY',
    rule_name: 'Same Day / Short Notice',
    min_hours_before_departure: 6,
    max_hours_before_departure: 24,
    matching_deadline_hours: 6,
    advance_amount: 500,
    refund_enabled: true,
    auto_cancel_on_no_match: true,
    active: true,
    priority: 1,
    timezone: 'Asia/Kolkata',
    description: 'Bookings made 6 to 24 hours before departure.',
    customer_message: 'Matching deadline is 6 hours before departure. If no return ride is matched, full ₹500 advance will be refunded.',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    rule_code: 'ONE_DAY',
    rule_name: 'One Day Advance',
    min_hours_before_departure: 24,
    max_hours_before_departure: 48,
    matching_deadline_hours: 24,
    advance_amount: 500,
    refund_enabled: true,
    auto_cancel_on_no_match: true,
    active: true,
    priority: 2,
    timezone: 'Asia/Kolkata',
    description: 'Bookings made 24 to 48 hours before departure.',
    customer_message: 'Matching deadline is 24 hours before departure. If no return ride is matched, full ₹500 advance will be refunded.',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    rule_code: 'ADVANCE_2_PLUS',
    rule_name: 'Two or More Days Advance',
    min_hours_before_departure: 48,
    max_hours_before_departure: null,
    matching_deadline_hours: 24,
    advance_amount: 500,
    refund_enabled: true,
    auto_cancel_on_no_match: true,
    active: true,
    priority: 3,
    timezone: 'Asia/Kolkata',
    description: 'Bookings made more than 48 hours before departure.',
    customer_message: 'Matching deadline is 24 hours before departure. If no return ride is matched, full ₹500 advance will be refunded.',
  },
]

export function parseDepartureToKolkataDate(dateStr: string, timeStr: string): Date {
  // Example: '2026-11-04', '06:00' -> returns Date in UTC matching 2026-11-04 06:00:00+05:30
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  // Construct ISO string with +05:30 offset
  const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`
  return new Date(isoString)
}

export function formatInKolkata(date: Date): string {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export async function fetchActiveBookingRules(): Promise<BookingRuleRecord[]> {
  try {
    const db = createServiceClient()
    const { data, error } = await db
      .from('booking_rules')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: true })

    if (error || !data || data.length === 0) {
      console.warn('Could not fetch booking_rules from Supabase, using default fallback rules.')
      return DEFAULT_RULES
    }
    return data as BookingRuleRecord[]
  } catch (err) {
    console.error('Error fetching booking_rules:', err)
    return DEFAULT_RULES
  }
}

/**
 * Core Dynamic Evaluation Engine
 * Evaluates lead time between booking creation and departure time.
 * Enforces strict boundary handling specified in Section 3 of prompt.
 */
export async function evaluateBookingLeadTime(
  travelDateStr: string,
  pickupTimeStr: string,
  bookingCreatedAt: Date = new Date(),
  rulesOverride?: BookingRuleRecord[]
): Promise<RuleEvaluationResult> {
  const departureDate = parseDepartureToKolkataDate(travelDateStr, pickupTimeStr)
  const rules = rulesOverride || (await fetchActiveBookingRules())

  // Calculate actual hours remaining
  const remainingMs = departureDate.getTime() - bookingCreatedAt.getTime()
  const remainingHours = remainingMs / (1000 * 60 * 60)

  // Rule D: Less than 6 hours before departure
  if (remainingHours < 6) {
    return {
      ruleCode: 'LATE_REQUEST',
      ruleName: 'Late Request (< 6 hours)',
      ruleId: 'late-request',
      remainingHours,
      matchingDeadline: bookingCreatedAt,
      matchingDeadlineKolkata: formatInKolkata(bookingCreatedAt),
      advanceAmount: 500,
      canAcceptPending: false,
      rejectionReason:
        'Departure is in less than 6 hours. Pending matching requests cannot be accepted. Cab can only be booked if a return ride is already confirmed.',
      ruleSnapshot: {
        category: 'LATE_REQUEST',
        lead_hours: remainingHours,
        evaluated_at: bookingCreatedAt.toISOString(),
      },
      customerExplanation:
        'Aapki departure mein 6 ghante se kam bache hain. Nayi pending request accept nahi ho sakti. Kripya customer support (8878933778) par call karein.',
    }
  }

  // Exact 24 hours boundary check: Prompt rule: "Exactly 24 hours: Do not accept as a pending booking; only accept with an already-secured match."
  if (Math.abs(remainingHours - 24) < 0.05) {
    return {
      ruleCode: 'BOUNDARY_24H',
      ruleName: '24-Hour Cutoff Boundary',
      ruleId: 'boundary-24h',
      remainingHours,
      matchingDeadline: bookingCreatedAt,
      matchingDeadlineKolkata: formatInKolkata(bookingCreatedAt),
      advanceAmount: 500,
      canAcceptPending: false,
      rejectionReason:
        'Booking arrived exactly at the 24-hour cutoff deadline. New pending bookings cannot be accepted at this cutoff.',
      ruleSnapshot: {
        category: 'BOUNDARY_24H',
        lead_hours: remainingHours,
        evaluated_at: bookingCreatedAt.toISOString(),
      },
      customerExplanation:
        'Yeh booking theek 24-ghante ke cutoff par aayi hai. Kripya secured return ride choose karein ya support se sampark karein.',
    }
  }

  // Match against dynamic database rules
  // Rule A: SAME_DAY (6 to 24 hours)
  // Rule B: ONE_DAY (more than 24, up to 48 hours)
  // Rule C: ADVANCE_2_PLUS (more than 48 hours)
  let matchedRule: BookingRuleRecord | null = null

  for (const rule of rules) {
    const minH = rule.min_hours_before_departure
    const maxH = rule.max_hours_before_departure

    if (maxH !== null) {
      if (remainingHours >= minH && remainingHours <= maxH) {
        matchedRule = rule
        break
      }
    } else {
      if (remainingHours > minH) {
        matchedRule = rule
        break
      }
    }
  }

  // Fallback to SAME_DAY if between 6 and 24, ONE_DAY if 24-48, ADVANCE_2_PLUS if >48
  if (!matchedRule) {
    if (remainingHours >= 6 && remainingHours <= 24) {
      matchedRule = rules.find((r) => r.rule_code === 'SAME_DAY') || DEFAULT_RULES[0]
    } else if (remainingHours > 24 && remainingHours <= 48) {
      matchedRule = rules.find((r) => r.rule_code === 'ONE_DAY') || DEFAULT_RULES[1]
    } else {
      matchedRule = rules.find((r) => r.rule_code === 'ADVANCE_2_PLUS') || DEFAULT_RULES[2]
    }
  }

  // Calculate matching deadline: departure minus matching_deadline_hours
  const deadlineHours = matchedRule.matching_deadline_hours
  const matchingDeadline = new Date(departureDate.getTime() - deadlineHours * 60 * 60 * 1000)

  // Verify that the matching deadline has not already passed
  const deadlinePassed = matchingDeadline.getTime() <= bookingCreatedAt.getTime()
  if (deadlinePassed) {
    return {
      ruleCode: matchedRule.rule_code,
      ruleName: matchedRule.rule_name,
      ruleId: matchedRule.id,
      remainingHours,
      matchingDeadline,
      matchingDeadlineKolkata: formatInKolkata(matchingDeadline),
      advanceAmount: Number(matchedRule.advance_amount || 500),
      canAcceptPending: false,
      rejectionReason: `The matching deadline for this departure (${deadlineHours} hours prior) has already passed. Only confirmed rides can be booked.`,
      ruleSnapshot: {
        ...matchedRule,
        evaluated_remaining_hours: remainingHours,
        evaluated_at: bookingCreatedAt.toISOString(),
      },
      customerExplanation: `Iss cab ki matching deadline (${deadlineHours} ghante pehle) nikal chuki hai. Kripya doosra time chuniye.`,
    }
  }

  return {
    ruleCode: matchedRule.rule_code,
    ruleName: matchedRule.rule_name,
    ruleId: matchedRule.id,
    remainingHours,
    matchingDeadline,
    matchingDeadlineKolkata: formatInKolkata(matchingDeadline),
    advanceAmount: Number(matchedRule.advance_amount || 500),
    canAcceptPending: true,
    ruleSnapshot: {
      rule_id: matchedRule.id,
      rule_code: matchedRule.rule_code,
      rule_name: matchedRule.rule_name,
      matching_deadline_hours: matchedRule.matching_deadline_hours,
      advance_amount: matchedRule.advance_amount,
      auto_cancel_on_no_match: matchedRule.auto_cancel_on_no_match,
      refund_enabled: matchedRule.refund_enabled,
      evaluated_remaining_hours: remainingHours,
      evaluated_at: bookingCreatedAt.toISOString(),
    },
    customerExplanation:
      matchedRule.customer_message ||
      `Matching deadline is ${deadlineHours} hours before departure. If no return ride is matched, full ₹500 advance will be refunded.`,
  }
}
