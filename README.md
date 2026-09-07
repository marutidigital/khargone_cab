# Khargone Cabs

A focused booking and operations platform for one-way cabs between Khargone and Indore.

The product goal, user journeys, current strengths, and improvement roadmap are documented in [`docs/PRODUCT.md`](docs/PRODUCT.md).

## Architecture

- Next.js 16 App Router for the public booking UI, admin UI, APIs, and Meta webhook.
- Supabase for bookings, customers, drivers, agents, and WhatsApp sessions.
- Meta WhatsApp Cloud API for customer conversations and booking updates.
- Gemini for the optional WhatsApp booking assistant.
- Resend for optional email notifications.
- A local JSON fallback under `data/` when Supabase credentials are absent/dummy.

## Local setup

```bash
nvm use
npm install
cp .env.local.example .env.local
npm run dev
```

Open:

- Public app: `http://localhost:3000`
- Admin subdomain: `http://admin.localhost:3000`
- Integration readiness: `http://localhost:3000/api/health`

Set `ADMIN_PASSWORD` to exercise admin Basic Auth locally. Production refuses admin access if the password is missing. Basic Auth is the first protective boundary; replace it with Supabase Auth and staff roles before onboarding multiple team members.

## WhatsApp Cloud API

Configure the `WHATSAPP_*` values from `.env.local.example`. In the Meta developer dashboard:

1. Add the WhatsApp product and connect a business number.
2. Set the callback URL to `https://<public-domain>/api/whatsapp`.
3. Set the same verify token in Meta and `WHATSAPP_VERIFY_TOKEN`.
4. Subscribe to the `messages` webhook field.
5. Set `WHATSAPP_APP_SECRET`; production webhooks are rejected unless their Meta signature is valid.
6. Keep `WHATSAPP_GRAPH_API_VERSION` explicit so API upgrades are intentional.

For local webhook testing, expose port 3000 through a secure HTTPS tunnel and temporarily set `NEXT_PUBLIC_APP_URL` to that public origin.

## Admin subdomain

Point `admin.<domain>` and the public domain to the same deployment, then configure:

```dotenv
ADMIN_DOMAIN=admin.<domain>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<long-random-password>
```

The Next.js proxy rewrites the admin subdomain root to `/admin` and protects the dashboard, `/api/admin/*`, `/api/drivers`, and `/api/agents`.

## Database

Run `supabase-schema.sql` in a new Supabase project. The schema enables RLS and revokes direct `anon`/`authenticated` access to customer and operational tables. Browser traffic must go through validated server routes; never expose `SUPABASE_SERVICE_ROLE_KEY` to client code.

New Supabase projects may require explicit Data API grants. The schema deliberately does not grant public roles because all access is server-side.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
curl http://localhost:3000/api/health
curl -I http://admin.localhost:3000
```

Bookings, drivers, and agents use live API-backed data. Vehicles, payments, reports, and settings remain clearly marked operational previews until their database tables and workflows are connected.
