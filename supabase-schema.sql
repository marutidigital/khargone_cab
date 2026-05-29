-- =============================================
-- KHARGONE CABS — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── BOOKINGS TABLE ──────────────────────────
create table public.bookings (
  id            uuid primary key default uuid_generate_v4(),
  booking_ref   text unique not null,          -- e.g. KC12345
  direction     text not null check (direction in ('KI','IK')),
  drop_point    text not null,                 -- rajendra | railway | airport
  drop_name     text not null,
  travel_date   date not null,
  pickup_time   time not null,
  is_night      boolean default false,
  base_fare     integer not null,
  discount      integer default 0,
  night_extra   integer default 0,
  total_fare    integer not null,
  passenger_name text not null,
  phone         text not null,
  email         text,
  status        text default 'waiting' check (status in ('waiting','confirmed','cancelled')),
  matched_with  uuid references public.bookings(id),
  whatsapp_sent boolean default false,
  email_sent    boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── WHATSAPP SESSIONS TABLE ──────────────────
create table public.whatsapp_sessions (
  id            uuid primary key default uuid_generate_v4(),
  phone         text not null unique,
  messages      jsonb default '[]'::jsonb,    -- conversation history
  booking_state jsonb default '{}'::jsonb,    -- partial booking being built
  last_active   timestamptz default now(),
  created_at    timestamptz default now()
);

-- ── RLS POLICIES ────────────────────────────
alter table public.bookings enable row level security;
alter table public.whatsapp_sessions enable row level security;

-- Allow anon read for bookings (for match display)
create policy "bookings_anon_read" on public.bookings
  for select using (true);

-- Allow anon insert (new bookings)
create policy "bookings_anon_insert" on public.bookings
  for insert with check (true);

-- Service role can do everything (API routes use service role)
create policy "bookings_service_all" on public.bookings
  for all using (auth.role() = 'service_role');

create policy "sessions_service_all" on public.whatsapp_sessions
  for all using (auth.role() = 'service_role');

-- ── INDEXES ─────────────────────────────────
create index idx_bookings_direction   on public.bookings(direction);
create index idx_bookings_travel_date on public.bookings(travel_date);
create index idx_bookings_status      on public.bookings(status);
create index idx_bookings_phone       on public.bookings(phone);
create index idx_whatsapp_phone       on public.whatsapp_sessions(phone);

-- ── UPDATED_AT TRIGGER ───────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function update_updated_at();

-- ── BOOKING REF GENERATOR ───────────────────
create or replace function generate_booking_ref()
returns text as $$
declare
  ref text;
begin
  loop
    ref := 'KC' || to_char(floor(random() * 90000 + 10000)::int, 'FM99999');
    exit when not exists (select 1 from public.bookings where booking_ref = ref);
  end loop;
  return ref;
end;
$$ language plpgsql;
