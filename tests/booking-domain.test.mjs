import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const require = createRequire(import.meta.url)
const typescript = require('../node_modules/typescript/lib/typescript.js')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'src/lib/config.ts'), 'utf8')
function loadConfig(env = process.env) {
  const compiled = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 },
  }).outputText
  const configModule = { exports: {} }
  new Function('exports', 'module', 'require', 'process', compiled)(configModule.exports, configModule, require, { env })
  return configModule.exports
}

const configModule = { exports: loadConfig() }

const {
  BOOKING_CONFIG,
  calculateBookingFare,
  getCompatibleMatchDepartures,
  getMatchCutoffAt,
  isAutoRefundDue,
  isAllowedMatchDeparture,
  isCutoffExpired,
  isMatchDealWithinWindow,
  isMatchTimeCompatible,
  isNightPickup,
} = configModule.exports

test('guaranteed fares stay fixed and match fares apply the same point deltas', () => {
  const points = [
    ['rajendra', 3000, 2000],
    ['bhawarkua', 3100, 2100],
    ['railway', 3200, 2200],
    ['airport', 3300, 2300],
    ['rajwada', 3300, 2300],
  ]

  for (const [point, guaranteedFare, matchFare] of points) {
    assert.equal(calculateBookingFare({ mode: 'guaranteed', point, pickupTime: '09:00' }).totalFare, guaranteedFare)
    assert.equal(calculateBookingFare({ mode: 'match', point, pickupTime: '09:00' }).totalFare, matchFare)
  }
})

test('night surcharge applies through 04:30 and not after', () => {
  assert.equal(isNightPickup('22:00'), true)
  assert.equal(isNightPickup('04:30'), true)
  assert.equal(isNightPickup('04:31'), false)
  assert.equal(isNightPickup('21:59'), false)
  assert.equal(calculateBookingFare({ mode: 'match', point: 'rajendra', pickupTime: '04:30' }).totalFare, 2300)
})

test('opposite-direction matching accepts the inclusive 4h and 8h boundaries only', () => {
  assert.equal(isMatchTimeCompatible('K2I', '07:00', 'I2K', '11:00'), true)
  assert.equal(isMatchTimeCompatible('K2I', '07:00', 'I2K', '15:00'), true)
  assert.equal(isMatchTimeCompatible('K2I', '07:00', 'I2K', '10:59'), false)
  assert.equal(isMatchTimeCompatible('K2I', '07:00', 'I2K', '15:01'), false)
  assert.equal(isMatchTimeCompatible('K2I', '07:00', 'K2I', '11:00'), false)
  assert.deepEqual(getCompatibleMatchDepartures('K2I', '07:00'), ['11:00', '13:00'])
})

test('Match Deal accepts only configured exact departures and respects the 30 hour window', () => {
  assert.equal(isAllowedMatchDeparture('K2I', '07:00'), true)
  assert.equal(isAllowedMatchDeparture('K2I', '07:30'), false)
  assert.equal(isMatchDealWithinWindow('2026-11-02', '10:00', new Date('2026-10-31T04:00:00Z')), true)
  assert.equal(isMatchDealWithinWindow('2026-11-01', '10:00', new Date('2026-10-31T04:00:00Z')), false)
  assert.equal(BOOKING_CONFIG.enableSuv, false)
  assert.throws(() => calculateBookingFare({ mode: 'guaranteed', point: 'rajendra', pickupTime: '09:00', vehicle: 'premium_suv' }))
})

test('Match Deal cutoff is exactly 24 hours before the pickup in India', () => {
  assert.equal(getMatchCutoffAt('2026-11-02', '07:00'), '2026-11-01T01:30:00.000Z')
})

test('cutoff and automatic refund boundaries are inclusive and ignore invalid timestamps', () => {
  const now = new Date('2026-11-01T12:00:00.000Z')
  assert.equal(isCutoffExpired('2026-11-01T12:00:00.000Z', now), true)
  assert.equal(isCutoffExpired('2026-11-01T12:00:01.000Z', now), false)
  assert.equal(isCutoffExpired('bad', now), false)
  assert.equal(isAutoRefundDue('2026-11-01T06:00:00.000Z', now), true)
  assert.equal(isAutoRefundDue('2026-11-01T06:00:01.000Z', now), false)
})

test('SUV stays hidden by default and is configurable with the configured upgrade fare', () => {
  assert.equal(BOOKING_CONFIG.enableSuv, false)
  const enabled = loadConfig({ ...process.env, NEXT_PUBLIC_ENABLE_SUV: 'true', NEXT_PUBLIC_SUV_EXTRA: '650' })
  const quote = enabled.calculateBookingFare({ mode: 'guaranteed', point: 'rajendra', pickupTime: '09:00', vehicle: 'premium_suv' })
  assert.equal(quote.vehicleExtra, 650)
  assert.equal(quote.totalFare, 3650)
})

test('Razorpay webhook signatures are verified against the configured secret', () => {
  const crypto = require('node:crypto')
  const razorpaySource = readFileSync(resolve(root, 'src/lib/razorpay.ts'), 'utf8')
  const compiled = typescript.transpileModule(razorpaySource, { compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  const secret = 'test-webhook-secret'
  const env = { ...process.env, RAZORPAY_WEBHOOK_SECRET: secret }
  new Function('exports', 'module', 'require', 'process', compiled)(module.exports, module, require, { env })
  const rawBody = '{"event":"payment.captured"}'
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  assert.equal(module.exports.verifyRazorpayWebhookSignature(rawBody, signature), true)
  assert.equal(module.exports.verifyRazorpayWebhookSignature(rawBody, '0'.repeat(64)), false)
})

test('processed webhook event IDs are acknowledged exactly once while failed events remain retryable', () => {
  const source = readFileSync(resolve(root, 'src/lib/webhook-idempotency.ts'), 'utf8')
  const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  new Function('exports', 'module', 'require', compiled)(module.exports, module, require)
  assert.equal(module.exports.shouldAcknowledgeDuplicateWebhook('2026-10-31T10:00:00Z'), true)
  assert.equal(module.exports.shouldAcknowledgeDuplicateWebhook(null), false)
})
