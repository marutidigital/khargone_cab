import urllib.request
import urllib.parse
import json
import base64
import time
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

# Read .env.local and .env
env_vars = {}
for env_file in ['.env.local', '.env']:
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip().strip('"').strip("'")

key_id = env_vars.get('RAZORPAY_KEY_ID')
key_secret = env_vars.get('RAZORPAY_KEY_SECRET')
supabase_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')

if not key_id or not key_secret or not supabase_url or not supabase_key:
    print("ERROR: Missing Razorpay or Supabase credentials in env files")
    exit(1)

# 1. Fetch Razorpay captured payments for last 90 days
now_ts = int(time.time())
from_ts = now_ts - (90 * 24 * 3600)
print(f"Fetching Razorpay payments from timestamp {from_ts} to {now_ts}...")

auth_header = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode()
headers = {"Authorization": f"Basic {auth_header}"}

all_payments = []
skip = 0
count = 100

while True:
    url = f"https://api.razorpay.com/v1/payments?from={from_ts}&count={count}&skip={skip}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            items = res_data.get('items', [])
            all_payments.extend(items)
            if len(items) < count:
                break
            skip += count
    except Exception as e:
        print(f"Error fetching from Razorpay: {e}")
        break

captured_payments = [p for p in all_payments if p.get('status') == 'captured']
print(f"Total payments fetched: {len(all_payments)}")
print(f"Total captured payments: {len(captured_payments)}")

# 2. Fetch Supabase Bookings and Payments via REST
sb_headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}"
}

# Bookings
b_url = f"{supabase_url}/rest/v1/bookings?select=id,booking_ref,passenger_name,phone,status,advance_paid,extras,created_at"
req = urllib.request.Request(b_url, headers=sb_headers)
with urllib.request.urlopen(req) as response:
    bookings_data = json.loads(response.read().decode())

# Payments table
p_url = f"{supabase_url}/rest/v1/payments?select=id,booking_id,provider_order_id,provider_payment_id,amount,payment_status,created_at"
req = urllib.request.Request(p_url, headers=sb_headers)
with urllib.request.urlopen(req) as response:
    payments_data = json.loads(response.read().decode())

# Index bookings by order_id and payment_id
bookings_by_order = {}
bookings_by_payment = {}
bookings_by_id = {}

for b in bookings_data:
    b_id = b.get('id')
    b_ref = b.get('booking_ref')
    b_name = b.get('passenger_name')
    b_phone = b.get('phone')
    b_status = b.get('status')
    b_adv = b.get('advance_paid')
    extras = b.get('extras') or {}
    b_oid = extras.get('razorpay_order_id')
    b_pid = extras.get('razorpay_payment_id')
    b_created = b.get('created_at')

    b_dict = {
        'id': str(b_id),
        'ref': b_ref,
        'name': b_name,
        'phone': b_phone,
        'status': b_status,
        'advance_paid': b_adv,
        'order_id': b_oid,
        'payment_id': b_pid,
        'created_at': str(b_created)
    }
    bookings_by_id[str(b_id)] = b_dict
    if b_oid:
        bookings_by_order.setdefault(b_oid, []).append(b_dict)
    if b_pid:
        bookings_by_payment.setdefault(b_pid, []).append(b_dict)

# Index payments table
pay_table_by_order = {}
pay_table_by_payment = {}
for p in payments_data:
    p_id = p.get('id')
    p_bid = p.get('booking_id')
    p_oid = p.get('provider_order_id')
    p_pid = p.get('provider_payment_id')
    p_dict = {
        'id': str(p_id),
        'booking_id': str(p_bid) if p_bid else None,
        'order_id': p_oid,
        'payment_id': p_pid,
        'amount': p.get('amount'),
        'status': p.get('payment_status')
    }
    if p_oid:
        pay_table_by_order.setdefault(p_oid, []).append(p_dict)
    if p_pid:
        pay_table_by_payment.setdefault(p_pid, []).append(p_dict)

print("\n" + "="*80)
print("RECONCILIATION REPORT (Razorpay Captured Payments vs Supabase Bookings)")
print("="*80)

correct_matches = []
missing_in_bookings = []
misattributed_bookings = []

for p in captured_payments:
    pid = p.get('id')
    oid = p.get('order_id')
    amt = p.get('amount', 0) / 100
    contact = p.get('contact', '')
    notes = p.get('notes', {})
    if isinstance(notes, list):
        notes = {}
    p_name = notes.get('passenger_name', 'N/A')
    p_phone = notes.get('passenger_phone', contact)
    created_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(p.get('created_at', 0)))

    matched_by_order = bookings_by_order.get(oid, [])
    matched_by_pay = bookings_by_payment.get(pid, [])
    p_records = pay_table_by_payment.get(pid, []) or pay_table_by_order.get(oid, [])

    if matched_by_order:
        b = matched_by_order[0]
        b_name_clean = (b['name'] or '').lower().strip()
        p_name_clean = (p_name or '').lower().strip()
        b_date_str = b['created_at'][:10]
        p_date_str = created_time[:10]
        
        # Check if booking is misattributed
        if b_date_str != p_date_str and p_name_clean not in b_name_clean and b_name_clean not in p_name_clean:
            misattributed_bookings.append({
                'payment_id': pid,
                'order_id': oid,
                'amount': amt,
                'payment_time': created_time,
                'payer_name': p_name,
                'payer_phone': p_phone,
                'attached_booking_ref': b['ref'],
                'attached_booking_name': b['name'],
                'attached_booking_date': b['created_at'],
                'reason': f"Payment on {p_date_str} for '{p_name}', attached to booking #{b['ref']} from {b_date_str} for '{b['name']}'"
            })
        else:
            correct_matches.append({
                'payment_id': pid,
                'order_id': oid,
                'amount': amt,
                'payment_time': created_time,
                'booking_ref': b['ref'],
                'passenger': b['name']
            })
    elif matched_by_pay:
        b = matched_by_pay[0]
        correct_matches.append({
            'payment_id': pid,
            'order_id': oid,
            'amount': amt,
            'payment_time': created_time,
            'booking_ref': b['ref'],
            'passenger': b['name']
        })
    else:
        attached_ref = None
        if p_records and p_records[0]['booking_id']:
            b_info = bookings_by_id.get(p_records[0]['booking_id'])
            if b_info:
                attached_ref = f"#{b_info['ref']} ({b_info['name']})"

        missing_in_bookings.append({
            'payment_id': pid,
            'order_id': oid,
            'amount': amt,
            'payment_time': created_time,
            'payer_name': p_name,
            'payer_phone': p_phone,
            'notes': notes,
            'attached_in_payments_table': attached_ref
        })

print(f"\n1. CORRECTLY MATCHED PAYMENTS ({len(correct_matches)}):")
for m in correct_matches:
    print(f"  [OK] Payment: {m['payment_id']} | Order: {m['order_id']} -> Booking #{m['booking_ref']} ({m['passenger']}) | Rs {m['amount']} | {m['payment_time']}")

print(f"\n2. MISATTRIBUTED / CORRUPTED BOOKINGS ({len(misattributed_bookings)}):")
for m in misattributed_bookings:
    print(f"  [MISMATCH] Payment: {m['payment_id']} | Order: {m['order_id']} | Rs {m['amount']} | Time: {m['payment_time']}")
    print(f"      Payer Notes: {m['payer_name']} (Phone: {m['payer_phone']})")
    print(f"      Attached to Booking: #{m['attached_booking_ref']} ({m['attached_booking_name']}) created on {m['attached_booking_date']}")
    print(f"      Issue: {m['reason']}")

print(f"\n3. MISSING IN BOOKINGS TABLE ({len(missing_in_bookings)}):")
for m in missing_in_bookings:
    print(f"  [MISSING] Payment: {m['payment_id']} | Order: {m['order_id']} | Rs {m['amount']} | Time: {m['payment_time']}")
    print(f"      Payer Name: {m['payer_name']} | Phone: {m['payer_phone']}")
    print(f"      Attached in payments table?: {m['attached_in_payments_table']}")
    print(f"      Notes: {json.dumps(m['notes'])}")
