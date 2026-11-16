import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import test from 'node:test'
const require=createRequire(import.meta.url),ts=require('typescript')
function load(path,deps={}) {
 const output=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
 const m={exports:{}};new Function('exports','module','require',output)(m.exports,m,id=>id in deps?deps[id]:require(id));return m.exports
}
const addresses=load('src/lib/booking-addresses.ts')
const config=load('src/lib/config.ts')
test('pickup/drop defaults reverse correctly, custom addresses remain separate and legacy bookings work',()=>{
 assert.deepEqual(addresses.defaultAddresses('K2I','Airport'),{pickup:'Bus Stand, Khargone',drop:'Airport, Indore'})
 assert.deepEqual(addresses.defaultAddresses('I2K','Railway Station'),{pickup:'Railway Station, Indore',drop:'Bus Stand, Khargone'})
 assert.deepEqual(addresses.getBookingAddresses({direction:'KI',address:'Gate 2, Khargone',drop_name:'Airport',extras:{drop_address:'Airport departure gate'}}),{pickup:'Gate 2, Khargone',drop:'Airport departure gate'})
 assert.equal(addresses.getBookingAddresses({direction:'IK',drop_name:'Airport'}).drop,'Bus Stand, Khargone')
})
function checkout(){
 const inserts=[],updates=[],orders=[]
 const db={from(){return {select(){return this},eq(){return this},limit:async()=>({data:[]}),insert(row){inserts.push(row);return {select(){return this},single:async()=>({data:{...row,id:'mock_booking',booking_ref:'TEST001'},error:null})}},update(row){updates.push(row);return {eq:async()=>({error:null})}}}}}
 class MockRazorpay {orders={create:async row=>{orders.push(row);return {id:'order_mock',...row,status:'created'}}}}
 const route=load('src/app/api/create-order/route.ts',{
 'next/server':{NextResponse:{json:(data,options={})=>({data,status:options.status||200})}},
 'razorpay':MockRazorpay,'@/lib/razorpay':{getRazorpayCredentials:()=>({keyId:'rzp_test_mock',keySecret:'test_secret'})},
 '@/lib/supabase-server':{createServiceClient:()=>db},'@/lib/config':config,'@/config/pricing':{PRICING_CONFIG:{points:[{id:'rajendra',name:'Rajendra Nagar'}]}},'@/lib/booking-addresses':addresses
 })
 return {...route,inserts,updates,orders}
}
const trip={direction:'K2I',mode:'match',point:'rajendra',date:'2099-11-20',time:'09:00',name:'Test Customer',phone:'9000000000',address:'House 1, Khargone',dropAddress:'  House 2, Indore  ',idempotencyKey:'address-test-0001'}
test('checkout stores both addresses without adding extra-km charges and preserves drop on order update',async()=>{
 const c=checkout();const result=await c.POST({json:async()=>({amount:50000,bookingData:trip})})
 assert.equal(result.status,200)
 assert.equal(c.inserts[0].address,'House 1, Khargone')
 assert.equal(c.inserts[0].extras.drop_address,'House 2, Indore')
 assert.equal(c.updates[0].extras.drop_address,'House 2, Indore')
 assert.equal(c.inserts[0].total_fare,2200)
 assert.equal(c.orders[0].amount,50000)
 assert.equal(c.orders.length,1)
})
test('invalid drop addresses cannot create a booking or payment order; legacy clients remain accepted',async()=>{
 for(const dropAddress of [{text:'unsafe'},'x'.repeat(251)]){
 const c=checkout();const result=await c.POST({json:async()=>({amount:50000,bookingData:{...trip,dropAddress}})})
 assert.equal(result.status,400);assert.equal(c.inserts.length,0);assert.equal(c.orders.length,0)
 }
 const c=checkout();const {dropAddress,...legacy}=trip;const result=await c.POST({json:async()=>({amount:50000,bookingData:legacy})});assert.equal(result.status,200);assert.equal(c.inserts[0].extras.drop_address,undefined)
})

test('legacy paid-booking fallback keeps existing metadata and the custom drop address',async()=>{
 const {createHmac}=await import('node:crypto')
 const before=process.env.RAZORPAY_KEY_SECRET;process.env.RAZORPAY_KEY_SECRET='mock_address_secret'
 try {
  const updates=[]
  const existing={id:'prior_mock',public_token:'private_mock',booking_ref:'TEST002',status:'pending_payment',phone:trip.phone,extras:{drop_address:'Original drop, Indore',unrelated_metadata:'keep'}}
  const db={from(table){return {select(columns){this.columns=columns;return this},eq(){return this},limit:async function(){return {data:[this.columns.includes('extras')?existing:{...existing,extras:undefined}]}},update(row){updates.push(row);return {eq:async()=>({error:null})}},insert:async()=>({error:null})}}}
  const route=load('src/app/api/bookings/route.ts',{
   'next/server':{NextResponse:{json:(data,options={})=>({data,status:options.status||200})}},
   '@/lib/supabase-server':{createServiceClient:()=>db},'@/lib/config':config,'@/config/pricing':{PRICING_CONFIG:{points:[{id:'rajendra',name:'Rajendra Nagar'}]}},
   '@/lib/verified-booking-payment':{fetchCapturedBookingPayment:async()=>500},'@/lib/booking-notifications':{notify:async()=>{},notifyAdmin:async()=>{}},'@/lib/whatsapp-templates':{sendWhatsAppTemplateMessage:async()=>{}},'@/lib/whatsapp-automation':{sendBookingAutomation:async()=>{}},'@/lib/matching-engine':{tryAutomaticFIFOMatch:async()=>{},secureAndConfirmMatch:async()=>{}}
  })
  const future=new Date(Date.now()+2*86400000).toISOString().slice(0,10)
  const body={...trip,date:future,consent:true,passengers:1,paymentOrderId:'order_mock',paymentId:'pay_mock',paymentSignature:createHmac('sha256','mock_address_secret').update('order_mock|pay_mock').digest('hex')}
  const result=await route.POST({json:async()=>body,headers:{get:()=>null}})
  assert.equal(result.status,200);assert.equal(updates[0].extras.drop_address,'House 2, Indore');assert.equal(updates[0].extras.unrelated_metadata,'keep')
 } finally {if(before===undefined)delete process.env.RAZORPAY_KEY_SECRET;else process.env.RAZORPAY_KEY_SECRET=before}
})

test('checkout rejects browser-reduced advance amounts before creating orders and preserves configured coupon amounts',async()=>{
 const reduced=checkout();const wrong=await reduced.POST({json:async()=>({amount:10000,bookingData:trip})});assert.equal(wrong.status,400);assert.equal(reduced.inserts.length,0);assert.equal(reduced.orders.length,0)
 const coupon=checkout();const accepted=await coupon.POST({json:async()=>({amount:200,bookingData:{...trip,couponCode:'MARUTI2'}})});assert.equal(accepted.status,200);assert.equal(coupon.inserts[0].advance_amount,2)
})
