import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const compiled = ts.transpileModule(readFileSync(new URL('../src/lib/booking-ux.ts', import.meta.url), 'utf8'), { compilerOptions: {module: ts.ModuleKind.CommonJS} }).outputText
const mod = {exports:{}}
new Function('exports','module',compiled)(mod.exports,mod)
const {customerStatus,indiaDate,addCalendarDays,timePeriod,timeLabel} = mod.exports

test('payment, a match and unknown states cannot display cab confirmation', () => {
 for(const status of ['waiting','pending_payment','matched','no_match_decision','cancelled','refunded','completed','unknown']) assert.equal(customerStatus(status).confirmed,false,status)
 assert.equal(customerStatus('confirmed').confirmed,true)
 assert.match(customerStatus('matched').label,/UNCONFIRMED/)
 assert.match(customerStatus('waiting').detail,/Usi travel date/)
})
test('India dates cross UTC midnight and calendar month boundaries correctly', () => {
 assert.equal(indiaDate(new Date('2026-11-15T19:00:00Z')),'2026-11-16')
 assert.equal(addCalendarDays('2026-12-31',1),'2027-01-01')
 assert.equal(addCalendarDays('2028-02-28',1),'2028-02-29')
})
test('period filters preserve exact 12-hour pickup labels', () => {
 assert.equal(timePeriod('04:59'),'Night')
 assert.equal(timePeriod('05:00'),'Morning')
 assert.equal(timePeriod('12:00'),'Afternoon')
 assert.equal(timePeriod('17:00'),'Evening')
 assert.equal(timePeriod('21:00'),'Night')
 assert.equal(timeLabel('00:05'),'12:05 AM')
 assert.equal(timeLabel('15:15'),'3:15 PM')
})
