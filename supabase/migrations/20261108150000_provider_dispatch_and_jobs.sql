-- MarutiCab: Provider Dispatch, Background Jobs, Feedback & Full Automation Migration
-- Run this in Supabase SQL Editor or apply via Supabase CLI.

begin;

-- 1. Independent Car Providers (Priority 1 to 6)
create table if not exists public.providers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null unique,
  priority    integer not null default 1 check (priority between 1 and 6),
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_providers_priority on public.providers(priority) where active = true;

-- 2. Enhance matches table with provider linkage and dispatch status
alter table public.matches
  add column if not exists provider_id uuid references public.providers(id) on delete set null,
  add column if not exists dispatch_status text not null default 'idle'
    check (dispatch_status in ('idle', 'dispatching', 'assigned', 'exhausted', 'completed')),
  add column if not exists current_provider_priority integer default 0;

-- 3. Sequential Provider Dispatch Attempts
create table if not exists public.dispatch_attempts (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references public.matches(id) on delete cascade,
  provider_id    uuid not null references public.providers(id) on delete cascade,
  attempt_order  integer not null default 1,
  status         text not null default 'sent'
                 check (status in ('sent', 'accepted', 'declined', 'timeout', 'details_submitted', 'cancelled')),
  wa_message_id  text,
  sent_at        timestamptz not null default now(),
  responded_at   timestamptz,
  timeout_at     timestamptz not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_dispatch_match on public.dispatch_attempts(match_id, created_at desc);
create index if not exists idx_dispatch_provider on public.dispatch_attempts(provider_id, status);

-- 4. Background Jobs Queue (for timeout, T-1h details release, reminders)
create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  run_at        timestamptz not null,
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'pending'
                check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts      integer not null default 0,
  max_attempts  integer not null default 3,
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_jobs_pending on public.jobs(run_at) where status = 'pending';
create index if not exists idx_jobs_type_status on public.jobs(type, status);

-- 5. Passenger Feedback & Ratings
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  driver_id   uuid references public.drivers(id) on delete set null,
  comment     text,
  source      text not null default 'whatsapp',
  created_at  timestamptz not null default now()
);

create index if not exists idx_feedback_driver on public.feedback(driver_id, rating);

-- 6. Enable Row Level Security (RLS) with Service Role bypass
alter table public.providers enable row level security;
alter table public.dispatch_attempts enable row level security;
alter table public.jobs enable row level security;
alter table public.feedback enable row level security;

-- Policies: Service role has full access
drop policy if exists "service_role_all_providers" on public.providers;
create policy "service_role_all_providers" on public.providers
  for all to service_role using (true) with check (true);

drop policy if exists "service_role_all_dispatch" on public.dispatch_attempts;
create policy "service_role_all_dispatch" on public.dispatch_attempts
  for all to service_role using (true) with check (true);

drop policy if exists "service_role_all_jobs" on public.jobs;
create policy "service_role_all_jobs" on public.jobs
  for all to service_role using (true) with check (true);

drop policy if exists "service_role_all_feedback" on public.feedback;
create policy "service_role_all_feedback" on public.feedback
  for all to service_role using (true) with check (true);

commit;
