import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {createHmac} from 'node:crypto'
import test from 'node:test'
const require=createRequire(import.meta.url),ts=require('typescript')
function load(file,deps={},env={}){const out=ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const m={exports:{}};new Function('exports','module','require','process',out)(m.exports,m,id=>id in deps?deps[id]:require(id),{env});return m.exports}
test('production refuses test merchant keys while isolated tests and previews can use their own keys',()=>{
 const production=load('src/lib/razorpay.ts',{}, {VERCEL_ENV:'production',RAZORPAY_KEY_ID:'rzp_test_mock',RAZORPAY_KEY_SECRET:'mock_secret'})
 assert.throws(()=>production.getRazorpayCredentials(),/Live Razorpay/)
 const live=load('src/lib/razorpay.ts',{}, {VERCEL_ENV:'production',RAZORPAY_KEY_ID:'rzp_live_mock',RAZORPAY_KEY_SECRET:'mock_secret'})
 assert.equal(live.getRazorpayCredentials().isTest,false)
})
test('webhook accepts only its configured webhook secret, never the API secret or legacy fallback',()=>{
 const raw='{"event":"payment.captured"}',secret='mock_webhook_secret'
 const m=load('src/lib/razorpay.ts',{}, {RAZORPAY_WEBHOOK_SECRET:secret,RAZORPAY_KEY_SECRET:'mock_api_secret'})
 const sign=s=>createHmac('sha256',s).update(raw).digest('hex')
 assert.equal(m.verifyRazorpayWebhookSignature(raw,sign(secret)),true)
 assert.equal(m.verifyRazorpayWebhookSignature(raw,sign('mock_api_secret')),false)
 assert.equal(m.verifyRazorpayWebhookSignature(raw,sign('maruticab_webhook_2025')),false)
 assert.equal(load('src/lib/razorpay.ts').verifyRazorpayWebhookSignature(raw,sign(secret)),false)
})
function verification({captured=true,existingPaymentBooking=null,found=true}={}){
 const writes=[],checks=[]
 const booking={id:'booking_B',booking_ref:'TEST_B',mode:'match',status:'pending_payment',advance_amount:500,total_fare:2200,extras:{razorpay_order_id:'order_B'}}
 const db = {
  from(table) {
   return {
    select(){return this}, eq(){return this}, contains(){return this},
    limit:async()=>({data:table==='bookings'?(found?[booking]:[]):existingPaymentBooking?[{id:'payment_row',booking_id:existingPaymentBooking}]:[]}),
    insert:async row=>{writes.push({table,row});return {error:null}},
    update(row){writes.push({table,row});return {eq:async()=>({error:null})}}
   }
  }
 }

 const m=load('src/app/api/verify-payment/route.ts',{
 'next/server':{NextResponse:{json:(data,options={})=>({data,status:options.status||200})}},
 '@/lib/supabase-server':{createServiceClient:()=>db},'@/lib/razorpay':{verifyRazorpayPaymentSignature:()=>true},
 '@/lib/verified-booking-payment':{fetchCapturedBookingPayment:async(id,order,b)=>{checks.push({id,order});if(!captured||b.extras.razorpay_order_id!==order)throw Error('Not captured for this booking');return 500}},
 '@/lib/whatsapp-templates':{sendWhatsAppTemplateMessage:async()=>{}},'@/lib/booking-notifications':{notifyAdmin:async()=>{}},'@/lib/matching-engine':{tryMatchBookingAndConfirm:async()=>{}}
 },{RAZORPAY_KEY_SECRET:'mock_secret'})
 return {writes,checks,call:(order='order_B')=>m.POST({json:async()=>({order_id:order,payment_id:'pay_mock',signature:'mock_valid_signature',booking_id:'booking_B'})})}
}
test('valid signature for a different order cannot credit a booking; uncaptured payments cannot credit either',async()=>{
 const wrong=verification();assert.equal((await wrong.call('order_A')).status,409);assert.equal(wrong.writes.length,0)
 const pending=verification({captured:false});assert.equal((await pending.call()).status,409);assert.equal(pending.writes.length,0)
})
test('captured booking payment is checked before persistence, and a reused payment cannot credit a second booking',async()=>{
 const valid=verification();assert.equal((await valid.call()).status,200);assert.equal(valid.checks.length,1);assert.ok(valid.writes.some(x=>x.row.advance_paid===500))
 const reused=verification({existingPaymentBooking:'booking_A'});assert.equal((await reused.call()).status,409);assert.equal(reused.writes.length,0)
 const missing=verification({found:false});assert.equal((await missing.call()).status,404);assert.equal(missing.writes.length,0)
})
test('no customer checkout contains a hardcoded test merchant credential',()=>{
 for(const file of ['src/components/RazorpayCheckoutButton.tsx','src/components/booking/BookingPaymentPanel.tsx','src/components/booking/PublicMatchBookingModal.tsx','src/app/checkout/page.tsx','src/app/book-return/[rideId]/page.tsx'])assert.doesNotMatch(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/rzp_test_[A-Za-z0-9]{6,}/,file)
})
