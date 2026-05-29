# KC · Khargone Cabs

Shared cab booking web app for the Khargone ↔ Indore route.

**Stack:** Next.js 14 · Supabase · WhatsApp Cloud API · Gemini AI · Resend · Vercel

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/your-org/khargone-cabs.git
cd khargone-cabs
npm install
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase-schema.sql`
3. Copy your Project URL and keys from **Settings → API**

### 3. Set up WhatsApp (Meta Business)
1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App → Business
2. Add "WhatsApp" product to your app
3. Set up a test phone number and get your **Phone Number ID** and **Access Token**
4. Set webhook URL to: `https://your-domain.com/api/whatsapp`
5. Subscribe to `messages` webhook field
6. Set your `WHATSAPP_VERIFY_TOKEN` (any random string you choose)

### 4. Set up Gemini AI
1. Go to [aistudio.google.com](https://aistudio.google.com) → Get API key
2. Copy your `GEMINI_API_KEY`

### 5. Set up Resend
1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create API key → copy `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to your verified domain email

### 6. Configure Environment Variables
```bash
cp .env.local.example .env.local
# Fill in all values in .env.local
```

### 7. Run Locally
```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

### Option A: Vercel Dashboard (Easiest)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project → select your repo
3. Add all environment variables from `.env.local` in Vercel dashboard
4. Deploy!

### Option B: GitHub Actions (CI/CD)
1. In Vercel: **Settings → General** → copy **Project ID** and **Org ID**
2. In Vercel: **Settings → Tokens** → create a token
3. In GitHub repo: **Settings → Secrets** → add:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
4. Every push to `main` auto-deploys

---

## App Structure

```
src/
├── app/
│   ├── page.tsx              # Main booking page
│   ├── admin/page.tsx        # Admin dashboard (real-time)
│   └── api/
│       ├── bookings/route.ts # GET/POST bookings, matching logic
│       └── whatsapp/route.ts # WhatsApp webhook + Gemini AI
├── components/
│   ├── Nav.tsx
│   ├── DirectionTabs.tsx
│   ├── DropList.tsx
│   ├── DatePicker.tsx
│   ├── TimePicker.tsx        # Clock dial time picker
│   ├── PriceBox.tsx
│   ├── BookForm.tsx
│   ├── BookingCards.tsx
│   ├── MatchPrompt.tsx
│   └── Toast.tsx
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── whatsapp.ts           # WhatsApp Cloud API
│   ├── gemini.ts             # Gemini AI chat
│   ├── email.ts              # Resend email
│   └── constants.ts          # Pricing, routes, helpers
└── types/index.ts
```

---

## Features

- **Booking** — drop point, date (30-day scroll), time (clock dial), fare calc
- **Matching** — auto-pairs KI ↔ IK bookings, instant confirmation
- **WhatsApp** — AI chatbot (Gemini) handles bookings via WhatsApp
- **Notifications** — WhatsApp + email on booking & match
- **Admin** — real-time dashboard with stats
- **Pricing** — early bird discounts, night surcharge, transparent breakdown

---

## Admin Dashboard

Visit `/admin` for the real-time admin view.

> **Note:** Add Supabase Auth or a simple password check before going live to protect the admin route.

---

## WhatsApp Webhook Setup

After deploying, set your webhook in Meta dashboard:
- **Callback URL:** `https://your-domain.vercel.app/api/whatsapp`
- **Verify Token:** same value as `WHATSAPP_VERIFY_TOKEN` in env
- **Subscribed fields:** `messages`
