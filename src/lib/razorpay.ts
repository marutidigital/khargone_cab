import { createHmac, timingSafeEqual } from 'node:crypto'

const apiBase = 'https://api.razorpay.com/v1'

// Credentials are supplied by the deployment environment only.
export function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || ''
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || ''
  const production = process.env.VERCEL_ENV === 'production' || (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV)
  if (production && keyId && !keyId.startsWith('rzp_live_')) throw new Error('Live Razorpay credentials are required in production.')
  return { keyId, keySecret, isTest: keyId.startsWith('rzp_test_') }
}

export function razorpayConfigured() {
  const { keyId, keySecret } = getRazorpayCredentials()
  return Boolean(keyId && keySecret)
}

export async function createRazorpayOrder(input: { amount: number; receipt: string; notes?: Record<string, string> }) {
  const { keyId: key, keySecret: secret } = getRazorpayCredentials()
  if (!key || !secret) throw new Error('Razorpay is not configured.')
  const response = await fetch(`${apiBase}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: input.amount * 100, currency: 'INR', receipt: input.receipt, notes: input.notes ?? {} }),
    cache: 'no-store',
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error?.description || 'Could not create payment order.')
  return result as { id: string; amount: number; currency: string; status: string }
}

export async function createRazorpayPaymentLink(input: {
  amount: number
  description: string
  referenceId: string
  customer: { name: string; contact: string }
  callbackUrl: string
  notes?: Record<string, string>
}) {
  const { keyId: key, keySecret: secret } = getRazorpayCredentials()
  if (!key || !secret) throw new Error('Razorpay is not configured.')
  const response = await fetch(`${apiBase}/payment_links`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: input.amount * 100, currency: 'INR', accept_partial: false,
      description: input.description, reference_id: input.referenceId,
      customer: { name: input.customer.name, contact: input.customer.contact },
      notify: { sms: false, email: false }, reminder_enable: false,
      callback_url: input.callbackUrl, callback_method: 'get', notes: input.notes ?? {},
    }),
    cache: 'no-store',
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error?.description || 'Could not create the upgrade payment link.')
  return result as { id: string; short_url: string; status: string }
}

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const { keySecret } = getRazorpayCredentials()
  const secrets = [
    keySecret,
    process.env.RAZORPAY_KEY_SECRET,
  ].filter(Boolean) as string[]

  let supplied: Buffer
  try { supplied = Buffer.from(signature, 'hex') } catch { return false }

  for (const s of secrets) {
    const expected = createHmac('sha256', s).update(`${orderId}|${paymentId}`).digest()
    if (supplied.length === expected.length && timingSafeEqual(supplied, expected)) {
      return true
    }
  }
  return false
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string) {
  const secrets = [process.env.RAZORPAY_WEBHOOK_SECRET].filter(Boolean) as string[]

  if (!signature || secrets.length === 0) return false

  let supplied: Buffer
  try {
    supplied = Buffer.from(signature, 'hex')
  } catch {
    return false
  }

  for (const s of secrets) {
    const expected = createHmac('sha256', s).update(rawBody).digest()
    if (supplied.length === expected.length && timingSafeEqual(supplied, expected)) {
      return true
    }
  }

  return false
}

export async function refundRazorpayPayment(paymentId: string, amount: number, idempotencyKey: string) {
  const { keyId: key, keySecret: secret } = getRazorpayCredentials()
  if (!key || !secret) throw new Error('Razorpay is not configured.')
  const response = await fetch(`${apiBase}/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'X-Refund-Idempotency': idempotencyKey,
    },
    body: JSON.stringify({ amount: amount * 100, speed: 'normal' }),
    cache: 'no-store',
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error?.description || 'Could not process refund.')
  return result as { id: string; status: string; payment_id: string }
}

export async function fetchRazorpayPayment(paymentId: string) {
  const { keyId: key, keySecret: secret } = getRazorpayCredentials()
  if (!key || !secret) throw new Error('Razorpay is not configured.')
  const response = await fetch(`${apiBase}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
    cache: 'no-store',
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error?.description || 'Could not verify payment.')
  return result as { id: string; order_id: string; amount: number; currency: string; status: string }
}
