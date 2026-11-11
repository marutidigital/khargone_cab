import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token is required.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('id,booking_ref,mode,status,direction,drop_name,travel_date,pickup_time,passenger_count,passenger_name,phone,total_fare,advance_amount,advance_paid,balance_amount,cutoff_at,refund_status,driver_name,driver_id,address,created_at')
    .eq('public_token', token)
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  // Auto-heal: If booking is still pending_payment but payment exists in payments table, confirm it immediately!
  if (data.status === 'pending_payment') {
    const { data: capturedPayments } = await supabase
      .from('payments')
      .select('amount,payment_status,provider_payment_id')
      .eq('booking_id', data.id)
      .eq('payment_status', 'captured')
      .order('created_at', { ascending: false })
      .limit(1)

    if (capturedPayments && capturedPayments.length > 0) {
      const paidAmt = Number(capturedPayments[0].amount || data.advance_amount || 500)
      const balance = Math.max(0, Number(data.total_fare || 0) - paidAmt)
      const healedStatus = data.mode === 'confirmed' ? 'confirmed' : 'waiting'

      await supabase
        .from('bookings')
        .update({
          status: healedStatus,
          advance_paid: paidAmt,
          advance_amount: paidAmt,
          balance_amount: balance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)

      data.status = healedStatus
      data.advance_paid = paidAmt
      data.advance_amount = paidAmt
      data.balance_amount = balance
    }
  }

  let driver = null
  if (data.driver_id) {
    const { data: driverData } = await supabase
      .from('drivers')
      .select('id,name,phone,vehicle_number,vehicle_model')
      .eq('id', data.driver_id)
      .limit(1)
      .single()
    if (driverData) driver = driverData
  }

  // Mask phone for customer privacy
  const rawPhone = String(data.phone || '')
  const maskedPhone = rawPhone.length >= 10
    ? `${rawPhone.slice(0, 2)}••••••${rawPhone.slice(-2)}`
    : rawPhone

  return NextResponse.json(
    {
      booking: {
        ...data,
        masked_phone: maskedPhone,
        driver,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
