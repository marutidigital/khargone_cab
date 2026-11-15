# MarutiCab WhatsApp booking journey

## Customer path

1. A greeting or unrecognised message displays the fixed main menu.
2. Book a Cab asks Khargone → Indore or Indore → Khargone.
3. The fare explanation shows ₹2,200 / ₹1,800 and the ₹500 advance, with the return-match condition.
4. Open Booking Form sends published Flow `1585365243178046`, screen `BOOK_CAB`.
5. The existing form collects the actual route, date, time, passenger contact details and combined pickup/drop address. The route selected in the form is authoritative; the published form does not support route prefilling in its current schema.
6. The server validates all required fields and a future departure, saves a pending-payment booking, then sends a native WhatsApp Review and Pay card and booking reference. A website checkout link is sent only if the native card fails. Duplicate message/session submissions reuse the existing reference.
7. Native checkout uses the Active `MarutiCabRazorpay` configuration, a stable booking-specific reference, and Razorpay order notes containing the booking ID/reference. The website fallback uses the server-side booking advance.
8. A verified checkout response or signed Razorpay webhook fetches the captured payment and order from Razorpay. Booking attribution, currency and amount must match before updating the booking and sending the payment-received message.
9. The paid booking enters the existing matching/dispatch process. Payment receipt does not itself promise a confirmed cab.

My Booking reads the latest booking for the sender. Main Menu exits the current help state. Talk to Team records a handoff and attempts an admin notification. AI is called only after the customer explicitly selects Ask AI a Question; that assistant has no booking/payment/refund tools.

## Existing connections

- Keep the existing shared Meta callback and brand-specific relay through `https://www.shikhabajaj.online/api/whatsapp/webhook` to `https://www.maruticab.in/api/whatsapp/webhook`.
- Configure `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN` or `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, and optionally `WHATSAPP_FLOW_ID`. Set `WHATSAPP_PAYMENT_CONFIGURATION=MarutiCabRazorpay`, verified Active in WhatsApp Manager for +91 72823 16090.
- Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`. Credentials come from the environment; the application no longer embeds payment secrets or forces test mode.
- Razorpay must deliver captured-payment events to `/api/razorpay/webhook`. The approved `payment_received` WhatsApp template is used by the existing receipt sender, with its existing text fallback inside the customer-service window.

## Verification and release

Run `node --test tests/whatsapp-booking-menu.test.mjs tests/whatsapp-custom-date.test.mjs`, lint the changed files, run type checking and a production build. Builds enforce TypeScript validation; the previous ignoreBuildErrors setting has been removed.

The implementation upgrades vulnerable dependencies and fixes the repository TypeScript failures found during verification. Rotate any genuine credentials that were previously committed. Do not claim a real payment is verified based on simulator tests.

For the final live check, use an opted-in test customer: greeting → route → fare → published form → pending booking → native Review and Pay → actual captured payment → WhatsApp receipt → matching status. Confirm delivery and persistence, then repeat a webhook to check duplication. Never create production payment fixtures or charge a customer for testing without authorization.

The shared relay and published Meta Flow are not modified by these code changes. Staff must monitor incoming support messages; the admin notification depends on the existing account/template configuration.

Native payment requests are logged with their Meta message ID. Delivery failure triggers the backup link for pending bookings. Razorpay callbacks fetch order notes when payment entities omit booking attribution; captured status, booking identity, currency and amount are independently checked.
