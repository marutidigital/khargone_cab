# Khargone Cabs product direction

## Goal

Khargone Cabs should be the fastest trustworthy way to reserve a one-way cab between Khargone and Indore. A customer should be able to understand the fare, request a ride, and receive their booking status through WhatsApp in under two minutes. Operations staff should manage matching, drivers, payments, and customer communication from a private admin workspace.

## Primary users

- Travellers going between Khargone and Indore, especially airport and railway passengers.
- Operations staff matching return journeys and assigning drivers.
- Local agents creating bookings for customers.

## Core journey

1. Choose direction, vehicle, drop point, date, and pickup time.
2. See the complete fare before sharing personal details.
3. Submit a booking request on the web or continue in WhatsApp.
4. Receive a booking reference and waiting/confirmed status on WhatsApp.
5. Operations matches the return journey, assigns a driver, and collects payment.

## What is already good

- A focused Khargone–Indore route instead of a generic taxi marketplace.
- Transparent fare breakdown, early-booking discount, and night surcharge.
- Return-trip matching is a useful operational advantage.
- Web, email, and WhatsApp notification paths already exist.
- The dashboard explores the right operational areas: bookings, dispatch, drivers, agents, vehicles, and payments.

## What must improve

### Now

- Make the public booking flow reliable and mobile-first.
- Replace dashboard mock state with API-backed operational data.
- Protect admin routes and serve them from `admin.<domain>`.
- Verify Meta webhook signatures and make every integration build-safe.
- Stop exposing customer and booking tables directly to anonymous Supabase users.
- Add clear loading, empty, offline, and integration-error states.

### Next

- Add Supabase Auth with staff roles instead of long-term Basic Auth.
- Model vehicles, payments, assignments, and audit logs in the database.
- Make matching consider date, direction, vehicle, pickup window, and capacity.
- Use approved WhatsApp templates for business-initiated messages outside the 24-hour customer-service window.
- Add booking tracking and cancellation links for customers.

## Domain structure

- `www.<domain>` or `<domain>` — public booking experience.
- `admin.<domain>` — private operations dashboard.
- Public API/webhook routes stay on the main deployment so Meta has one stable callback URL.

Both domains can point to the same Next.js deployment. Middleware rewrites the admin subdomain root to `/admin`; production requires `ADMIN_PASSWORD` until staff authentication is implemented.
