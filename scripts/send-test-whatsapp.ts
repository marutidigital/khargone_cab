/* Run with `pnpm whatsapp:test` after adding WHATSAPP_TEST_TO to your shell environment. */
async function main() {
const recipient = process.env.WHATSAPP_TEST_TO || ''
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || ''
const version = process.env.WHATSAPP_API_VERSION || 'v21.0'
if (!recipient) throw new Error('Set WHATSAPP_TEST_TO to a Meta-approved test number.')
const digits = recipient.replace(/\D/g, '')
const to = digits.length === 10 ? `91${digits}` : digits
if (!/^91[6-9]\d{9}$/.test(to)) throw new Error('WHATSAPP_TEST_TO must be a valid Indian mobile number.')
const templates: [string, string[]][] = [
  ['booking_received_match', ['Test Customer', 'Khargone', 'Indore', '5 Nov 2026', '07:00', '500']],
  ['booking_received_guaranteed', ['Test Customer', 'Khargone', 'Indore', '5 Nov 2026', '07:00', '500']],
  ['match_confirmed_customer', ['Test Customer', 'Khargone', 'Indore', '5 Nov 2026', '07:00', 'Test Driver', 'MP 09 AB 1234', '9826012345', '1500']],
  ['match_confirmed_driver', ['Khargone to Indore', '07:00', 'Bus Stand', '5 Nov 2026', 'Test Customer', '9826012345', '2', '1500']],
  ['no_match_options', ['Test Customer', '5 Nov 2026', '07:00', '3000']],
  ['refund_processed', ['Test Customer', '500']],
  ['ride_reminder_customer', ['07:00', 'Bus Stand Khargone', 'Test Driver', '9826012345']],
  ['ride_reminder_driver', ['07:00', 'Bus Stand Khargone', 'Test Customer', '9826012345']],
  ['feedback_request', ['Test Customer']],
  ['admin_alert', ['Test alert', 'MC12345', 'Khargone to Indore', '5 Nov 2026', '07:00']],
]
const mock = process.env.WHATSAPP_MOCK === 'true'
if (!mock && (!phoneId || !token)) throw new Error('Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TOKEN before sending.')
for (const [name, values] of templates) {
  const components: Record<string, unknown>[] = [{ type: 'body', parameters: values.map((text) => ({ type: 'text', text })) }]
  if (['booking_received_match', 'booking_received_guaranteed', 'match_confirmed_customer'].includes(name)) {
    components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'sample-booking-token-12345678901234567890' }] })
  }
  if (name === 'no_match_options') {
    components.push({ type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'REFUND:sample-booking-token-12345678901234567890' }] })
    components.push({ type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'UPGRADE:sample-booking-token-12345678901234567890' }] })
  }
  const body = {
    messaging_product: 'whatsapp', to, type: 'template',
    template: { name, language: { code: 'en' }, components },
  }
  if (mock) {
    console.log(`[MOCK] ${name} → …${to.slice(-4)}`)
    continue
  }
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(`${name} failed (${response.status}, Meta code ${result.error?.code || 'unknown'}).`)
  console.log(`${name}: sent (message ID ${result.messages?.[0]?.id || 'unknown'})`)
}
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'WhatsApp test send failed.')
  process.exitCode = 1
})
