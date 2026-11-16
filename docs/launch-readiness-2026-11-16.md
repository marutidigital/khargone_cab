# MarutiCab launch audit — 16 November 2026

Decision: **not ready for an unattended public launch on 17 November**. This is an evidence-based audit, not proof that every customer path has completed a real transaction.

## Payment credentials and changes

Vercel production RAZORPAY_KEY_ID was checked privately and already has the live prefix. No credential values are recorded here. Production now rejects test merchant IDs; browser checkout no longer falls back to a hardcoded test ID. Webhook signatures require the dedicated webhook secret. Payment callbacks verify captured status, INR, amount, order ownership and booking attribution with Razorpay before crediting a booking. Browser-supplied advance tampering is rejected. Existing reduced-advance coupons are preserved pending owner decision.

These source changes are for preview/review. They have not been promoted to production. No live charge or refund was performed.

## Verified

- Homepage and customer/legal pages responded successfully over HTTPS; apex redirects to www.
- Unauthenticated admin APIs and cron endpoint rejected access; unsigned WhatsApp and Razorpay webhooks rejected requests. Wrong WhatsApp verification tokens rejected at both relay and destination.
- Supabase project active; all 24 public tables have RLS enabled. Initial health request timed out, followed by two healthy database checks.
- WhatsApp phone reports CONNECTED, CLOUD_API and GREEN quality. Native payment configuration is present.
- Public available-rides endpoint responds; no rides currently returned.
- 43 automated tests passed, TypeScript passed, production build passed with non-secret placeholder public build variables. ESLint: 0 errors, 166 existing warnings. Production dependency audit: 0 vulnerabilities.

## Launch blockers

1. **Booking privacy:** phone-only `/api/bookings/my-rides` returns private booking tokens; `/api/pay/booking` accepts a short booking reference and returns contact/address/token data. Require verified ownership or a secure private capability, and minimize public responses before advertising.
2. **Matching and confirmation:** seven historical matches violate the intended signed 4–12 hour timing window (four reverse ordering, three under four hours). Matching confirmation lacks an atomic claim across both rides. Payment handlers can mark a candidate booking confirmed before the pairing function, which refuses already-confirmed bookings. Resolve and test concurrent claims and failed pairing; do not promise confirmation solely on advance payment.
3. **WhatsApp operational alerts:** 30 admin notification failures in the past seven days, Meta error 132001 (template missing in requested language). Some admin logs say sent without a Meta message ID. Correct the actual approved templates and recipient configuration, and track provider acknowledgements honestly.
4. **Inbound reliability:** webhook events are deduplicated before processing, but failed processing can still be acknowledged with HTTP 200 and cannot be retried safely. Inbound processed timestamps are not updated. Persist processing state, retry failures and mark success only after handling.
5. **Scheduled operations:** GitHub scheduler calls cutoff/reminders, not the tick queue processor. Jobs table empty and no tick execution was proven. Cutoff/deadline cancellation routes are disabled although database rules advertise auto-cancel/refund. Agree the operating policy and verify the actual scheduler; do not imply automatic refunds currently run.
6. **Payment reconciliation:** historical captured payment records include four without a booking, four attached to pending-payment bookings and eight undercredited booking balances. These may include old tests, so reconcile individually before declaring customer losses. Status GET also repairs payment state from any payment row without a captured filter; legacy verification route uses inconsistent column names. Eliminate these competing state writers.

## Still unverified

A fresh customer MENU trigger and full customer booking/payment/confirmation path need an owner-operated test. No customer messages or financial transactions were sent by the audit. Meta token lacks management permission to inspect current approved templates, subscriptions and Flow details. Correct signed webhook/challenge tests were not run because sensitive secrets were not readable through the connector. Browser verification timed out; HTTP availability alone is not visual/mobile QA. Supabase leaked-password protection is disabled; review before onboarding more admins.

## Deployment safety

The repository's deploy workflow uses production deployment on pull requests. Do not open a PR expecting a safe preview until that workflow is corrected. Keep changes on the preview branch and explicitly inspect the deployment target. Production remains on its earlier deployment until launch blockers are resolved and the reviewed release is promoted.
