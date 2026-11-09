const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env and .env.local
if (fs.existsSync('.env.local')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) process.env[k] = envConfig[k];
}
if (fs.existsSync('.env')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env'));
  for (const k in envConfig) process.env[k] = envConfig[k];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to Supabase at:', url ? url.substring(0, 25) + '...' : 'NONE');

const supabase = createClient(url, key);

async function run() {
  try {
    // 1. Recent Bookings
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('id,booking_ref,status,passenger_name,phone,created_at,advance_paid,total_fare')
      .order('created_at', { ascending: false })
      .limit(10);
    console.log('\n--- RECENT 10 BOOKINGS ---');
    if (bErr) console.error('Bookings error:', bErr);
    else console.table(bookings);

    // 2. Paid but pending / waiting / stuck bookings
    const { data: stuckBookings, error: sErr } = await supabase
      .from('bookings')
      .select('id,booking_ref,status,passenger_name,phone,created_at,advance_paid')
      .gt('advance_paid', 0)
      .eq('status', 'pending_payment');
    console.log('\n--- PAID BUT PENDING_PAYMENT BOOKINGS ---');
    console.log(stuckBookings);

    // 3. Notifications log
    const { data: notifs, error: nErr } = await supabase
      .from('notifications')
      .select('id,booking_id,recipient_type,template,status,error,sent_at,created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    console.log('\n--- RECENT 10 NOTIFICATIONS ---');
    if (nErr) console.error('Notifications error:', nErr);
    else console.table(notifs);

    // 4. App config for whatsapp_automation
    const { data: appConfig, error: cErr } = await supabase
      .from('app_config')
      .select('*')
      .eq('key', 'whatsapp_automation');
    console.log('\n--- APP CONFIG (whatsapp_automation) ---');
    console.log(JSON.stringify(appConfig, null, 2));

    // 5. Razorpay Webhook Events in DB
    const { data: webhookEvents, error: wErr } = await supabase
      .from('razorpay_webhook_events')
      .select('event_id,event_type,created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    console.log('\n--- RAZORPAY WEBHOOK EVENTS IN DB ---');
    if (wErr) console.log('razorpay_webhook_events table status:', wErr.message);
    else console.table(webhookEvents);

  } catch (err) {
    console.error('Audit script exception:', err);
  }
}

run();
