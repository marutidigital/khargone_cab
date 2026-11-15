import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
function load(file, dependencies = {}) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const loaded = { exports: {} }
  new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, (id) => {
    if (id in dependencies) return dependencies[id]
    if (id.startsWith('@/')) throw new Error(`Unexpected dependency ${id}`)
    return require(id)
  })
  return loaded.exports
}

function menu() {
  const conversation = { phone: '9999999999', state: 'IDLE', step: 1, data: {} }
  const sends = [], alerts = []
  let aiCalls = 0
  const { handleBookingMenu } = load('src/lib/whatsapp-booking-menu.ts', {
    '@/lib/whatsapp-conversation': { getConversation: async () => conversation, saveConversation: async () => {} },
    '@/lib/whatsapp': Object.fromEntries(['sendText', 'sendFlowMessage', 'sendInteractiveButtons'].map((name) => [name, async (input) => { sends.push({ name, ...input }); return { messages: [{ id: 'mock' }] } }])),
    '@/lib/booking-notifications': { notifyAdmin: async (...args) => alerts.push(args) },
    '@/lib/supabase-server': { createServiceClient: () => ({ from: () => ({ select() { return this }, eq() { return this }, order() { return this }, limit: async () => ({ data: [] }) }) }) },
    '@/lib/openai': { createChatCompletion: async () => { aiCalls++; return 'Help answer' } },
  })
  return { conversation, sends, alerts, aiCalls: () => aiCalls, send: (text) => handleBookingMenu('919999999999', text, `msg${sends.length}`) }
}

test('greeting, route, fare explanation and published booking form require zero AI calls', async () => {
  for (const route of ['KI', 'IK']) {
    const m = menu()
    await m.send('hi')
    assert.equal(m.sends.at(-1).buttons[0].id, 'BTN_BOOK_CAB')
    await m.send('BTN_BOOK_CAB')
    assert.equal(m.conversation.state, 'BOOKING_ROUTE')
    await m.send(`BTN_ROUTE_${route}`)
    assert.match(m.sends.at(-1).body, route === 'KI' ? /2,200/ : /1,800/)
    await m.send('BTN_OPEN_BOOKING_FLOW')
    assert.equal(m.sends.at(-1).name, 'sendFlowMessage')
    assert.equal(m.conversation.state, 'AWAITING_BOOKING_FLOW')
    assert.equal(m.aiCalls(), 0)
  }
})

test('unexpected text and old buttons return fixed menu without calling AI', async () => {
  const m = menu()
  for (const text of ['How do I book?', 'BTN_TIME_0800', 'hello!', 'I paid']) await m.send(text)
  assert.equal(m.aiCalls(), 0)
  assert.equal(m.sends.at(-1).buttons[0].id, 'BTN_BOOK_CAB')
})

test('AI is called only after explicit opt-in and MENU exits AI help', async () => {
  const m = menu()
  await m.send('BTN_SUPPORT')
  assert.equal(m.aiCalls(), 0)
  await m.send('BTN_AI_HELP')
  assert.equal(m.aiCalls(), 0)
  await m.send('Is AC included?')
  assert.equal(m.aiCalls(), 1)
  await m.send('MENU')
  await m.send('What next?')
  assert.equal(m.aiCalls(), 1)
})

test('human support records handoff and following messages without AI', async () => {
  const m = menu()
  await m.send('BTN_HUMAN_SUPPORT')
  await m.send('Please help')
  assert.equal(m.alerts.length, 2)
  assert.equal(m.aiCalls(), 0)
})

test('My Booking and Main Menu work without AI', async () => {
  const m = menu()
  await m.send('BTN_MY_BOOKING')
  assert.match(m.sends.at(-1).body, /koi booking nahi/)
  await m.send('BTN_MAIN_MENU')
  assert.equal(m.conversation.state, 'MAIN_MENU')
  assert.equal(m.aiCalls(), 0)
})

test('published Flow payload validates route, future departure, phone, name and address', () => {
  const { validateBookingFlow } = load('src/lib/whatsapp-flow-validation.ts')
  const now = new Date('2026-11-15T10:00:00Z')
  const valid = { route: 'khargone_to_indore', travel_date: '2026-11-20', pickup_time: '02:00 PM', passenger_name: 'Test Passenger', passenger_phone: '9999999999', pickup_address: 'Pickup and drop details' }
  assert.equal(validateBookingFlow(valid, now), null)
  for (const invalid of [{ route: '' }, { travel_date: '2026-02-31' }, { travel_date: '2026-11-01' }, { pickup_time: '25:00 PM' }, { passenger_name: '' }, { passenger_phone: '123' }, { pickup_address: '' }, { passenger_email: 'bad' }]) {
    assert.equal(typeof validateBookingFlow({ ...valid, ...invalid }, now), 'string')
  }
})

test('payment confirmation requires captured payment, correct booking, order and amount', () => {
  const { assertCapturedBookingPayment } = load('src/lib/verified-booking-payment.ts', { '@/lib/razorpay': {} })
  const booking = { id: 'b1', booking_ref: 'KC12345', advance_amount: 500 }
  const order = { id: 'order_1', amount: 50000, notes: { booking_ref: 'KC12345' } }
  const payment = { status: 'captured', order_id: 'order_1', amount: 50000, currency: 'INR' }
  assert.doesNotThrow(() => assertCapturedBookingPayment(payment, order, booking))
  for (const change of [{ status: 'authorized' }, { order_id: 'order_other' }, { amount: 200 }, { currency: 'USD' }]) assert.throws(() => assertCapturedBookingPayment({ ...payment, ...change }, order, booking))
  assert.throws(() => assertCapturedBookingPayment(payment, { ...order, notes: { booking_ref: 'KC99999' } }, booking))
})

test('verified checkout updates booking and sends receipt using verified amount, with no AI', async () => {
  const { createHmac } = require('node:crypto')
  const oldSecret = process.env.RAZORPAY_KEY_SECRET
  process.env.RAZORPAY_KEY_SECRET = 'unit-test-secret'
  const booking = { id: 'b1', booking_ref: 'KC12345', mode: 'match', status: 'pending_payment', phone: '9999999999', passenger_name: 'Test Passenger', total_fare: 2200, travel_date: '2099-11-20', advance_paid: 0, extras: { whatsapp_contact: '919999999999' } }
  const updates = [], receipts = []
  let verifications = 0
  const handler = load('src/app/api/pay/confirm/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), { status: init?.status || 200 }) } },
    '@/lib/supabase-server': { createServiceClient: () => ({ from: (table) => ({
      select() { return this }, eq() { return this }, limit: async () => ({ data: [booking] }),
      update(values) { updates.push({ table, values }); return { eq: async () => ({ error: null }) } },
      insert: async () => ({ error: null }),
    }) }) },
    '@/lib/booking-notifications': { notifyAdmin: async () => {} },
    '@/lib/matching-engine': { tryAutomaticFIFOMatch: async () => {} },
    '@/lib/whatsapp-templates': { sendWhatsAppTemplateMessage: async (input) => { receipts.push(input); return { success: true } } },
    '@/lib/verified-booking-payment': { fetchCapturedBookingPayment: async () => { verifications++; return 500 } },
  })
  try {
    const body = { bookingRef: 'KC12345', orderId: 'order_123', paymentId: 'pay_123', signature: 'invalid', advancePaid: 2 }
    const invalid = await handler.POST({ json: async () => body })
    assert.equal(invalid.status, 400)
    assert.equal(updates.length, 0)
    assert.equal(verifications, 0)
    body.signature = createHmac('sha256', 'unit-test-secret').update('order_123|pay_123').digest('hex')
    const valid = await handler.POST({ json: async () => body })
    assert.equal(valid.status, 200)
    assert.equal(verifications, 1)
    assert.equal(updates[0].values.advance_paid, 500)
    assert.equal(updates[0].values.balance_amount, 1700)
    assert.equal(updates[0].values.status, 'waiting')
    assert.equal(receipts[0].templateCode, 'payment_received')
    assert.equal(receipts[0].toPhone, '919999999999')
    assert.equal(receipts[0].variables[1], '500')
  } finally {
    if (oldSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET
    else process.env.RAZORPAY_KEY_SECRET = oldSecret
  }
})
