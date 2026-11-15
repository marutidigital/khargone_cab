import { createHash } from 'node:crypto'

export type WhatsAppPaymentOrder = {
  bookingId?: string | null
  bookingRef: string
  amountInRs: number
  customerName: string
  routeName: string
  travelDate: string
  pickupTime: string
}

export function buildWhatsAppPaymentOrder(input: WhatsAppPaymentOrder, configurationName: string) {
  if (!configurationName?.trim() || configurationName.length > 60) throw new Error('Approved WhatsApp payment configuration is not configured.')
  const amountPaise = Math.round(input.amountInRs * 100)
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) throw new Error('Invalid payment amount.')
  // A stable order reference links Meta, Razorpay and this exact booking.
  const referenceId = `MC${createHash('sha256').update(input.bookingId || input.bookingRef).digest('hex').slice(0, 30)}`
  return {
    referenceId,
    message: {
      type: 'interactive',
      interactive: {
        type: 'order_details',
        body: { text: `Namaste ${input.customerName || 'Passenger'}!\n\nBooking #${input.bookingRef}\n${input.routeName}\n${input.travelDate} at ${input.pickupTime}\n\n₹${input.amountInRs} advance ke liye Review and Pay chuniye. Payment verify hone ke baad receipt aur booking update yahin milega.` },
        footer: { text: 'MarutiCab · Advance booking payment' },
        action: {
          name: 'review_and_pay',
          parameters: {
            reference_id: referenceId,
            type: 'digital-goods',
            payment_settings: [{ type: 'payment_gateway', payment_gateway: {
              type: 'razorpay',
              configuration_name: configurationName.trim(),
              razorpay: {
                receipt: referenceId,
                notes: { booking_id: input.bookingId || '', booking_ref: input.bookingRef, whatsapp_reference_id: referenceId },
              },
            } }],
            currency: 'INR',
            total_amount: { value: amountPaise, offset: 100 },
            order: {
              status: 'pending',
              items: [{ retailer_id: `advance_${input.bookingRef}`, name: 'MarutiCab booking advance', amount: { value: amountPaise, offset: 100 }, quantity: 1 }],
              subtotal: { value: amountPaise, offset: 100 },
              tax: { value: 0, offset: 100 },
            },
          },
        },
      },
    },
  }
}
