import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
function load(file, dependencies = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const loaded = { exports: {} }
  new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, (id) => id in dependencies ? dependencies[id] : require(id))
  return loaded.exports
}
const { buildWhatsAppPaymentOrder } = load('src/lib/whatsapp-payment-order.ts')
const input = { bookingId: 'a-booking-uuid', bookingRef: 'KC12345', amountInRs: 500, customerName: 'Test Passenger', routeName: 'Khargone → Indore', travelDate: '2099-11-20', pickupTime: '08:00 AM' }

test('native card uses the configured Razorpay connection and 50000 paise', () => {
  const { message, referenceId } = buildWhatsAppPaymentOrder(input, 'MarutiCabRazorpay')
  assert.equal(message.interactive.type, 'order_details')
  assert.equal(message.interactive.action.name, 'review_and_pay')
  const params = message.interactive.action.parameters
  assert.deepEqual(params.total_amount, { value: 50000, offset: 100 })
  assert.equal(params.order.subtotal.value, params.total_amount.value)
  assert.equal(params.currency, 'INR')
  assert.equal(params.payment_settings[0].payment_gateway.configuration_name, 'MarutiCabRazorpay')
  assert.equal(params.payment_settings[0].payment_gateway.razorpay.receipt, referenceId)
  assert.equal(params.payment_settings[0].payment_gateway.razorpay.notes.booking_id, input.bookingId)
  assert.equal(params.payment_settings[0].payment_gateway.razorpay.notes.booking_ref, input.bookingRef)
})

test('native reference is stable per booking, unique between bookings and within Meta limit', () => {
  const first = buildWhatsAppPaymentOrder(input, 'ApprovedConfig').referenceId
  assert.equal(buildWhatsAppPaymentOrder(input, 'ApprovedConfig').referenceId, first)
  assert.notEqual(buildWhatsAppPaymentOrder({ ...input, bookingId: 'another-booking' }, 'ApprovedConfig').referenceId, first)
  assert.ok(first.length <= 35)
  assert.match(first, /^[A-Za-z0-9]+$/)
})

test('missing configuration or invalid payment amount cannot produce a payable card', () => {
  assert.throws(() => buildWhatsAppPaymentOrder(input, ''))
  assert.throws(() => buildWhatsAppPaymentOrder(input, 'x'.repeat(61)))
  for (const amountInRs of [0, -1, NaN, Infinity]) assert.throws(() => buildWhatsAppPaymentOrder({ ...input, amountInRs }, 'ApprovedConfig'))
})

test('sending a native card records the Meta message ID and reports API failures', async () => {
  const originalFetch = globalThis.fetch
  const keys = ['WHATSAPP_PAYMENT_CONFIGURATION', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_TOKEN', 'WHATSAPP_MOCK']
  const old = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  Object.assign(process.env, { WHATSAPP_PAYMENT_CONFIGURATION: 'ApprovedConfig', WHATSAPP_PHONE_NUMBER_ID: '12345', WHATSAPP_TOKEN: 'unit-test-token', WHATSAPP_MOCK: 'false' })
  const updates = [], requests = []
  const sender = load('src/lib/whatsapp.ts', {
    '@/lib/whatsapp-payment-order': { buildWhatsAppPaymentOrder },
    '@/lib/supabase-server': { createServiceClient: () => ({ from: () => ({ insert: async () => ({ error: null }), update: (values) => ({ eq: async () => { updates.push(values); return { error: null } } }) }) }) },
  })
  try {
    globalThis.fetch = async (_url, init) => { requests.push(JSON.parse(init.body)); return new Response(JSON.stringify({ messages: [{ id: 'wamid.native' }] }), { status: 200 }) }
    const result = await sender.sendInChatPaymentOrder({ ...input, to: '919999999999' })
    assert.equal(result.success, true)
    assert.equal(requests[0].interactive.type, 'order_details')
    assert.equal(updates[0].wa_message_id, 'wamid.native')
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 131009, message: 'Invalid configuration' } }), { status: 400 })
    const failure = await sender.sendInChatPaymentOrder({ ...input, to: '919999999999' })
    assert.equal(failure.success, false)
    assert.equal(updates.at(-1).status, 'failed')
    process.env.WHATSAPP_PAYMENT_CONFIGURATION = ''
    const missing = await sender.sendInChatPaymentOrder({ ...input, to: '919999999999' })
    assert.equal(missing.success, false)
  } finally {
    globalThis.fetch = originalFetch
    for (const key of keys) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key] }
  }
})
