-- KHARGONE CABS — SUPABASE SCHEMA
-- Safe to run on a new project or re-run after a partial setup.

begin;

create extension if not exists "uuid-ossp";

-- Core customers
create table if not exists public.clients (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  phone       text not null unique,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Drivers available to the operations team
create table if not exists public.drivers (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  phone            text not null,
  vehicle_type     text not null default 'sedan'
                   check (vehicle_type in ('sedan', 'suv', 'innova')),
  vehicle_number   text,
  vehicle_model    text,
  status           text not null default 'active'
                   check (status in ('active', 'inactive')),
  rating           numeric(2,1) not null default 4.5,
  trips_completed  integer not null default 0 check (trips_completed >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Booking agents managed from the admin dashboard
create table if not exists public.agents (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  phone            text not null,
  email            text,
  area             text not null default 'Khargone',
  commission_pct   integer not null default 10
                   check (commission_pct between 0 and 100),
  status           text not null default 'active'
                   check (status in ('active', 'inactive')),
  bookings_linked  integer not null default 0 check (bookings_linked >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Cab bookings and pair matches
create table if not exists public.bookings (
  id               uuid primary key default uuid_generate_v4(),
  booking_ref      text unique not null,
  direction        text not null check (direction in ('KI', 'IK')),
  drop_point       text not null check (drop_point in ('rajendra', 'railway', 'airport')),
  drop_name        text not null,
  travel_date      date not null,
  pickup_time      time not null,
  is_night         boolean not null default false,
  base_fare        integer not null check (base_fare >= 0),
  discount         integer not null default 0 check (discount >= 0),
  night_extra      integer not null default 0 check (night_extra >= 0),
  total_fare       integer not null check (total_fare >= 0),
  passenger_name   text not null,
  phone            text not null,
  email            text,
  passenger_count  integer not null default 1 check (passenger_count between 1 and 12),
  vehicle_type     text not null default 'sedan'
                   check (vehicle_type in ('sedan', 'suv', 'innova')),
  advance_paid     integer not null default 0 check (advance_paid >= 0),
  notes            text,
  status           text not null default 'waiting'
                   check (status in ('waiting', 'confirmed', 'cancelled')),
  client_id        uuid references public.clients(id) on delete set null,
  matched_with     uuid references public.bookings(id) on delete set null,
  driver_id        uuid references public.drivers(id) on delete set null,
  driver_name      text,
  agent_id         uuid references public.agents(id) on delete set null,
  agent_name       text,
  whatsapp_sent    boolean not null default false,
  email_sent       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- WhatsApp assistant conversation state
create table if not exists public.whatsapp_sessions (
  id             uuid primary key default uuid_generate_v4(),
  phone          text not null unique,
  messages       jsonb not null default '[]'::jsonb,
  booking_state  jsonb not null default '{}'::jsonb,
  last_active    timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

-- Repair columns when this script is re-run on an older/partial database.
alter table public.bookings
  add column if not exists passenger_count integer not null default 1,
  add column if not exists vehicle_type text not null default 'sedan',
  add column if not exists advance_paid integer not null default 0,
  add column if not exists notes text,
  add column if not exists driver_id uuid references public.drivers(id) on delete set null,
  add column if not exists driver_name text,
  add column if not exists agent_id uuid references public.agents(id) on delete set null,
  add column if not exists agent_name text;

-- All application data is server-only. The service role bypasses RLS, while
-- browser roles cannot read or mutate customer or operational records directly.
alter table public.clients enable row level security;
alter table public.drivers enable row level security;
alter table public.agents enable row level security;
alter table public.bookings enable row level security;
alter table public.whatsapp_sessions enable row level security;

revoke all on table public.clients from anon, authenticated;
revoke all on table public.drivers from anon, authenticated;
revoke all on table public.agents from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
revoke all on table public.whatsapp_sessions from anon, authenticated;

create index if not exists idx_clients_phone on public.clients(phone);
create index if not exists idx_drivers_status on public.drivers(status);
create index if not exists idx_drivers_phone on public.drivers(phone);
create index if not exists idx_agents_status on public.agents(status);
create index if not exists idx_agents_phone on public.agents(phone);
create index if not exists idx_bookings_client_id on public.bookings(client_id);
create index if not exists idx_bookings_direction on public.bookings(direction);
create index if not exists idx_bookings_travel_date on public.bookings(travel_date);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_phone on public.bookings(phone);
create index if not exists idx_bookings_match_lookup
  on public.bookings(travel_date, direction, vehicle_type, status, created_at);
create index if not exists idx_whatsapp_phone on public.whatsapp_sessions(phone);

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.update_updated_at();

drop trigger if exists drivers_updated_at on public.drivers;
create trigger drivers_updated_at
  before update on public.drivers
  for each row execute function public.update_updated_at();

drop trigger if exists agents_updated_at on public.agents;
create trigger agents_updated_at
  before update on public.agents
  for each row execute function public.update_updated_at();

drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.update_updated_at();

create or replace function public.generate_booking_ref()
returns text
language plpgsql
set search_path = public
as $$
declare
  generated_ref text;
begin
  loop
    generated_ref := 'KC' || to_char(floor(random() * 90000 + 10000)::int, 'FM99999');
    exit when not exists (
      select 1 from public.bookings where booking_ref = generated_ref
    );
  end loop;
  return generated_ref;
end;
$$;

revoke execute on function public.update_updated_at() from public, anon, authenticated;
revoke execute on function public.generate_booking_ref() from public, anon, authenticated;
grant execute on function public.generate_booking_ref() to service_role;

commit;
