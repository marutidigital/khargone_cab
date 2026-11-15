import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')

function controller() {
  const conv = { phone: '9999999999', state: 'SELECT_DATE', step: 2, data: { direction: 'KI' } }
  const source = readFileSync(new URL('../src/lib/whatsapp-ai-assistant.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const loaded = { exports: {} }
  const mockRequire = (id) => {
    if (id === '@/lib/whatsapp-conversation') return { getConversation: async () => conv, saveConversation: async () => {} }
    if (id === '@/lib/supabase-server') return { createServiceClient: () => ({}) }
    if (id === '@/lib/openai') return { createChatCompletion: () => { throw new Error('Custom date must not call AI') } }
    if (id.startsWith('@/')) return {}
    return require(id)
  }
  new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, mockRequire)
  return { conv, send: (text) => loaded.exports.handleWhatsAppAIConversation('919999999999', text) }
}

test('Other Date prompts for typed date and advances to pickup time without AI', async () => {
  const { conv, send } = controller()
  conv.data.travel_date = '2099-01-01'
  const prompt = await send('BTN_DATE_OTHER')
  assert.equal(conv.state, 'ENTER_TRAVEL_DATE')
  assert.equal(conv.data.travel_date, undefined)
  assert.match(prompt.replyText, /DD\/MM\/YYYY/)
  assert.equal(prompt.buttons, undefined)
  const reply = await send('20/11/2099')
  assert.equal(conv.data.travel_date, '2099-11-20')
  assert.equal(conv.state, 'SELECT_TIME')
  assert.equal(conv.data.direction, 'KI')
  assert.equal(reply.buttons[0].id, 'BTN_TIME_0800')
})

test('Invalid and past custom dates remain at date entry', async () => {
  const { conv, send } = controller()
  await send('BTN_DATE_OTHER')
  for (const input of ['31/02/2099', '20/13/2099', '01/01/2020', 'nonsense']) {
    const reply = await send(input)
    assert.equal(conv.state, 'ENTER_TRAVEL_DATE')
    assert.equal(conv.data.travel_date, undefined)
    assert.match(reply.replyText, /valid travel date/)
    assert.equal(reply.buttons, undefined)
  }
})

test('Custom date entry accepts ISO dates and allows switching to Today', async () => {
  const { conv, send } = controller()
  await send('BTN_DATE_OTHER')
  await send('2099-11-20')
  assert.equal(conv.data.travel_date, '2099-11-20')
  await send('BTN_DATE_OTHER')
  await send('BTN_DATE_TODAY')
  assert.equal(conv.state, 'SELECT_TIME')
  assert.match(conv.data.travel_date, /^\d{4}-\d{2}-\d{2}$/)
})
