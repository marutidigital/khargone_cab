# Premium booking UX preview

Branch: `codex/premium-booking-ux`. Based on `846729b`.
Scope: customer frontend only. No API routes, migrations, matching code, notification code, credentials, schedules, admin pages or pricing configuration changed. Production must not be promoted until review.

## Changed files

- `src/app/page.tsx`: renders the new booking experience.
- `src/components/booking/PremiumBookingExperience.tsx`: three steps; route/location, India date/exact time, customer details/review/payment; current calculator; retry idempotency; preserved Back state; contextual WhatsApp help; legacy verified-payment submission fallback.
- `src/components/booking/BookingHeader.tsx`: compact customer header with always accessible phone and WhatsApp actions.
- `src/components/booking/BookingPaymentPanel.tsx`: request wording, existing payment/coupon amounts and API contracts, synchronous checkout lock and busy state.
- `src/app/booking/[token]/page.tsx`: white customer status view, polling and refresh, actual payment totals, driver data, support and private reference. Only backend `confirmed` shows cab confirmation. `matched`, paid/waiting and unknown statuses cannot imply confirmation.
- `src/app/booking/page.tsx`: retained secure-status redirect and removed unreachable misleading no-advance copy.
- `src/app/my-rides/page.tsx`: matched requests no longer get a green Confirmed badge.
- `src/lib/booking-ux.ts`: display-only status, India calendar and time labels/period filters.
- `src/app/layout.tsx`: allows browser zoom for accessibility.
- `src/app/globals.css`: scoped primary button styling.
- `tests/booking-ux.test.mjs`: request/confirmation separation, India date rollover and time filters.
- `docs/preview/*.jpg`: desktop and mock paid/unconfirmed mobile screenshots.

## Verification

- Production build and TypeScript check pass with Node 22 and placeholder Supabase configuration. No production secrets used for local verification.
- 33 automated tests pass, including the existing mocked WhatsApp menu, Flow, payment capture verification, signatures and notification idempotency coverage.
- ESLint completes with zero errors; existing repository warnings remain.
- Browser review at 320px, 390px and 1440px: no horizontal page overflow. Required time validation blocks missing time, period selection alone cannot submit, past suggested times disabled, passenger/phone/consent gate payment. Back preserves exact time and passenger input. WhatsApp links contain route, location, date and time.
- A separate, uncommitted local mock proxy blocked all non-fixture API requests. Mock create-order, Razorpay checkout and verify-payment exercised cancel/retry and success. Successful mock payment navigated to the request page showing UNCONFIRMED and advance ₹500 / balance ₹1,700. No real charges, booking records, customer messages or production token lookups were made.
- Confirmation mapping uses only explicit backend status. Payment alone and `matched` alone remain unconfirmed.

## Existing backend limitations — not fixed in this frontend scope

The full business guarantee requested in the brief cannot be certified from UI tests:

1. Automatic matching filters the opposite-direction candidate query by the same `travel_date`. However, the final `secureAndConfirmMatch` function does not independently recheck every eligibility requirement. An automatic query filtering dates does not prove all manual/admin confirmation paths enforce the same requirement.
2. The automatic matcher uses a minimum absolute time gap, while the separate compatibility helper also defines a maximum gap. These paths do not have identical enforcement. The helper's boundary tests pass; this is not proof of the automatic engine's complete eligibility.
3. The inspected final confirmation code does not establish a single atomic database allocation or require an assigned driver/vehicle before confirming. Concurrent and multiple-candidate allocation safety remains unverified. No concurrency tests were run against production, and the engine was not rewritten to make tests pass.
4. Existing refund copy differs between published policy pages and operational code. The new UI links the existing policy and avoids promising new refund deadlines or automatic refund processing.
5. The existing secure booking GET route can auto-heal payment state and write to the database. Status browser tests therefore use a mock token/API, never real customer tokens.
6. The existing GitHub PR workflow uses `--prod` even for pull requests. No PR was created or workflow dispatched. A direct preview deployment is used instead. Do not open a PR until the deployment workflow is reviewed.

Before a production release, separately review the matching/atomic allocation guarantees and refund-policy wording with explicit backend scope. This preview preserves those existing implementations rather than claiming they have been corrected.

## Review guidance

Review the three steps, Hindi/English wording, mobile readability and UNCONFIRMED status screenshot. The hosted preview uses the existing project integrations; do not submit a real booking or pay just to review its layout. Existing available-return-rides pages remain accessible from the footer. This preview does not change the WhatsApp-native payment experience.

## Hinglish copy revision

The redesigned booking journey, payment panel, status pages, lookup page and support links now use Roman-script Hinglish. Display status labels include “ABHI CONFIRM NAHI” and “CAB CONFIRM HAI”; backend status keys, fare calculations, payment amounts and matching behavior remain unchanged. Time period display uses Subah / Dopahar / Shaam / Raat while internal filter values remain unchanged.

## Final language preference

Short headings, form labels, status badges and buttons use familiar English (Today, Tomorrow, Continue, Enter coupon code, Pay & Submit Request). One-line messages and explanations stay in natural Roman Hinglish, using common English terms such as trip details, travel date, payment and refund policy. This supersedes the earlier all-Hinglish labels.

## Confirmed Booking tab

- Added a prominent homepage tab next to New Cab Request. Switching tabs preserves the request form, and switching is disabled while checkout is busy. Tab controls support arrow keys and Home/End.
- Reused the existing public available-rides API and existing return checkout. No API routes, database or matching/payment algorithms changed.
- Rebuilt `PublicRideMatchingBoard.tsx` with visitor-direction route labels, date/Today/All Dates filters, base-fare estimates from current configuration, explicit Available Match badges, 20-second refresh, loading/error/empty states, and View & Book links. Failed refresh removes stale cards.
- Updated `/confirmed-rides` to use the same board and customer header. Existing return checkout copy no longer promises instant/100% confirmation, and it rejects an API response explicitly marked unavailable.
- Local isolated browser fixtures verified both directions, today and future dates, no matches, failed refresh with no stale cards, 320px overflow, and a ride that became unavailable before checkout. Screenshot uses mock rides; those were never added to the database or deployment.
- Read-only production public API check returned 0 available rides at verification time. The real board therefore correctly shows an empty list until eligible waiting requests are returned by that API.
- 33 tests, TypeScript and build pass. Targeted ESLint has zero errors; warnings remain in the existing return-checkout page.
- Existing public API caps the list at 50 rows and defines eligibility/cutoff behavior. This frontend does not widen those backend rules. Existing payment/atomic matching limitations described above still apply; the tab does not certify them resolved.

## Custom pickup and drop addresses

The owner clarified: collect custom addresses only. Do not calculate additional kilometres or add map-based charges. Drivers explain extra-distance charges during the trip.

- Homepage route step now offers Rajendra Nagar, Railway Station and Airport with fares from the existing calculator. Pickup and Drop Address are separate editable fields, prefilled for the direction/location. Reversing direction swaps addresses. Exact addresses appear in review, support-message prefill and private booking status.
- Existing return-match checkout also captures both addresses.
- Pickup continues to use the existing `bookings.address` field. Drop is stored under `bookings.extras.drop_address`, without a schema migration. The create-order API validates the new optional field before any order/booking write; the legacy bookings API also accepts/preserves it. Older clients without the field continue working. Existing extras are preserved during the fallback pending-payment update.
- Customer payment pages show the extra-distance notice. No distance calculation, map integration, new per-km fee, fare change or environment change was added.
- Authenticated admin booking views show the saved addresses. Public ride-list queries and payloads are unchanged and do not include the custom drop address.
- `src/lib/booking-addresses.ts` provides defaults, legacy fallback and drop-input validation. `tests/booking-addresses.test.mjs` verifies reverse direction, separate custom addresses, mocked create-order persistence, unchanged fare/advance, invalid-input rejection before writes, and compatibility with old clients. All 37 tests pass.
- This revision extends the original frontend-only scope solely for the requested address persistence in two existing APIs and admin display. No production database writes or test payments/messages were performed.

Browser verification for addresses: Railway Station/Airport selection updates the Indore address; reversing direction swaps the two custom addresses; 320px has no horizontal overflow. Isolated mock checkout preserved both exact typed addresses through the order payload and private booking status. The mock order remained 50000 paise and the route fare stayed ₹2,200. A fallback API regression test verifies unrelated JSON metadata is retained. No real customer addresses were used.
