import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHmac } from 'node:crypto'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('../node_modules/typescript/lib/typescript.js')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const loadTs = (file, env = process.env) => {
  const source = readFileSync(resolve(root, file), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  const mockRequire = (id) => {
    if (id === '@/lib/supabase-server') return { createServiceClient: () => ({}) }
    if (id === '@/lib/config') return { calculateBookingFare: ({ point, pickupTime }) => ({ totalFare: (point === 'airport' || point === 'rajwada' ? 3300 : point === 'railway' ? 3200 : point === 'bhawarkua' ? 3100 : 3000) + (pickupTime >= '22:00' || pickupTime <= '04:30' ? 300 : 0) }) }
    return require(id)
  }
  new Function('exports', 'module', 'require', 'process', compiled)(module.exports, module, mockRequire, { env })
  return module.exports
}

test('Indian WhatsApp numbers normalize to E.164 digits and invalid numbers are rejected', () => {
  const { normalizeWhatsAppPhone } = loadTs('src/lib/whatsapp.ts')
  assert.equal(normalizeWhatsAppPhone('98260 12345'), '919826012345')
  assert.equal(normalizeWhatsAppPhone('+91 98260 12345'), '919826012345')
  assert.throws(() => normalizeWhatsAppPhone('12345'))
})

test('template variable ordering matches the approved booking message bodies', () => {
  const { mapTemplateVariables } = loadTs('src/lib/whatsapp-templates.ts')
  const booking = { passenger_name: 'Ramesh', direction: 'KI', travel_date: '2026-11-05', pickup_time: '07:00:00', advance_amount: 500, balance_amount: 1500 }
  assert.deepEqual(mapTemplateVariables('booking_received_match', booking), ['Ramesh', 'Khargone', 'Indore', '2026-11-05', '07:00', '500'])
  assert.deepEqual(mapTemplateVariables('match_confirmed_customer', booking, { name: 'Amit', phone: '9826012345', vehicle_number: 'MP 09 AB 1234' }), ['Ramesh', 'Khargone', 'Indore', '2026-11-05', '07:00', 'Amit', 'MP 09 AB 1234', '9826012345', '1500'])
  assert.deepEqual(mapTemplateVariables('no_match_options', { ...booking, drop_point: 'rajendra', total_fare: 2000 }), ['Ramesh', '2026-11-05', '07:00', '3000'])
})

test('WhatsApp webhook signature verification accepts valid HMAC and rejects altered or absent signatures', () => {
  const { verifyWhatsAppWebhookSignature } = loadTs('src/lib/whatsapp.ts')
  const body = '{"object":"whatsapp_business_account"}'
  const secret = 'unit-test-app-secret'
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
  assert.equal(verifyWhatsAppWebhookSignature(body, signature, secret), true)
  assert.equal(verifyWhatsAppWebhookSignature(body, 'sha256=' + '0'.repeat(64), secret), false)
  assert.equal(verifyWhatsAppWebhookSignature(body, null, secret), false)
})

test('refund and upgrade quick reply payloads carry the booking token and reject malformed values', () => {
  const { parseWhatsAppActionPayload } = loadTs('src/lib/whatsapp.ts')
  const token = 'AbCdEf0123456789_-AbCdEf0123456789'
  assert.deepEqual(parseWhatsAppActionPayload(`REFUND:${token}`), { action: 'REFUND', token })
  assert.deepEqual(parseWhatsAppActionPayload(`UPGRADE:${token}`), { action: 'UPGRADE', token })
  assert.equal(parseWhatsAppActionPayload('REFUND:short'), null)
})

test('free-text customer service window lasts exactly 24 hours and rejects future timestamps', () => {
  const { isWithinWhatsAppServiceWindow } = loadTs('src/lib/whatsapp.ts')
  const now = new Date('2026-10-31T12:00:00.000Z')
  assert.equal(isWithinWhatsAppServiceWindow('2026-10-30T12:00:01.000Z', now), true)
  assert.equal(isWithinWhatsAppServiceWindow('2026-10-30T12:00:00.000Z', now), false)
  assert.equal(isWithinWhatsAppServiceWindow('2026-10-31T12:00:01.000Z', now), false)
  assert.equal(isWithinWhatsAppServiceWindow('invalid', now), false)
})

test('notification event idempotency is enforced by a unique durable database key', () => {
  const migration = readFileSync(resolve(root, 'supabase/migrations/20261031210000_whatsapp_cloud_api.sql'), 'utf8')
  const sender = readFileSync(resolve(root, 'src/lib/booking-notifications.ts'), 'utf8')
  assert.match(migration, /unique index if not exists notifications_idempotency_key_unique/)
  assert.match(sender, /booking\.id\}:\$\{recipientType\}:\$\{templateName\}:\$\{eventVersion\}/)
  assert.match(sender, /if \(error\) return \{ status: 'duplicate'/)
})
