begin;

create extension if not exists pgcrypto;

alter table public.bookings
  add column if not exists mode text not null default 'guaranteed',
  add column if not exists vehicle text not null default 'economy_sedan',
  add column if not exists address text,
  add column if not exists extras jsonb not null default '{}'::jsonb,
  add column if not exists advance_amount integer not null default 0,
  add column if not exists balance_amount integer not null default 0,
  add column if not exists match_id uuid,
  add column if not exists cutoff_at timestamptz,
  add column if not exists no_match_at timestamptz,
  add column if not exists decision_at timestamptz,
  add column if not exists refund_status text not null default 'not_applicable',
  add column if not exists public_token text,
  add column if not exists idempotency_key text,
  add column if not exists reminder_sent_at timestamptz;
alter table public.bookings add column if not exists consent_whatsapp boolean not null default true;
alter table public.bookings add column if not exists passengers integer;
alter table public.bookings add column if not exists is_night boolean not null default false;

update public.bookings
set vehicle = case when vehicle_type = 'sedan' then 'economy_sedan' else 'premium_suv' end
where vehicle is distinct from case when vehicle_type = 'sedan' then 'economy_sedan' else 'premium_suv' end;

update public.bookings
set balance_amount = greatest(total_fare - advance_paid, 0)
where balance_amount = 0 and advance_paid > 0;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings drop constraint if exists bookings_mode_check;
alter table public.bookings drop constraint if exists bookings_vehicle_check;
alter table public.bookings drop constraint if exists bookings_money_check;
alter table public.bookings drop constraint if exists bookings_refund_status_check;
alter table public.bookings drop constraint if exists bookings_match_id_fkey;
alter table public.bookings
  add constraint bookings_status_check check (status in (
    'pending_payment', 'waiting', 'matched', 'confirmed',
    'no_match_decision', 'completed', 'refunded', 'cancelled'
  ));
alter table public.bookings
  add constraint bookings_mode_check check (mode in ('match', 'guaranteed')),
  add constraint bookings_vehicle_check check (vehicle in ('economy_sedan', 'premium_suv')),
  add constraint bookings_money_check check (
    advance_amount >= 0 and balance_amount >= 0 and total_fare >= 0
  ),
  add constraint bookings_refund_status_check check (refund_status in (
    'not_applicable', 'pending', 'processing', 'processed', 'failed'
  ));

create unique index if not exists bookings_public_token_unique
  on public.bookings(public_token) where public_token is not null;
create unique index if not exists bookings_idempotency_key_unique
  on public.bookings(idempotency_key) where idempotency_key is not null;
create unique index if not exists bookings_phone_date_active_unique
  on public.bookings(phone, travel_date)
  where idempotency_key is not null and status in ('pending_payment', 'waiting', 'matched', 'confirmed', 'no_match_decision');
create index if not exists bookings_match_deal_waiting_idx
  on public.bookings(travel_date, direction, pickup_time, created_at)
  where mode = 'match' and status = 'waiting' and match_id is null;
create index if not exists bookings_cutoff_idx
  on public.bookings(cutoff_at) where mode = 'match' and status = 'waiting';
create index if not exists bookings_no_match_decision_idx
  on public.bookings(decision_at) where status = 'no_match_decision';

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  booking_out uuid not null unique references public.bookings(id) on delete restrict,
  booking_back uuid not null unique references public.bookings(id) on delete restrict,
  driver_id uuid references public.drivers(id) on delete set null,
  vehicle text not null default 'economy_sedan' check (vehicle in ('economy_sedan', 'premium_suv')),
  confirmed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint matches_distinct_bookings check (booking_out <> booking_back)
);

alter table public.bookings
  add constraint bookings_match_id_fkey foreign key (match_id)
  references public.matches(id) on delete set null;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  purpose text not null default 'advance' check (purpose in ('advance', 'upgrade')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  amount integer not null check (amount > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'created' check (status in (
    'created', 'authorized', 'captured', 'failed', 'refund_pending', 'refunded'
  )),
  refund_id text unique,
  refund_idempotency_key text unique,
  captured_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments(booking_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  template text not null,
  recipient text,
  status text not null check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_booking_idx on public.notifications(booking_id, created_at desc);

create table if not exists public.razorpay_webhook_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;
alter table public.matches enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.razorpay_webhook_events enable row level security;

revoke all on public.matches, public.payments, public.notifications, public.razorpay_webhook_events
  from anon, authenticated;
grant select, insert, update, delete on public.matches, public.payments, public.notifications,
  public.razorpay_webhook_events to service_role;
grant select, insert, update, delete on public.bookings to service_role;
revoke all on public.bookings from anon, authenticated;

create or replace function public.try_match_booking(
  p_booking_id uuid,
  p_min_gap_hours integer default 4,
  p_max_gap_hours integer default 8
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  current_booking public.bookings%rowtype;
  other_booking public.bookings%rowtype;
  new_match_id uuid;
begin
  select * into current_booking from public.bookings where id = p_booking_id;
  if not found or current_booking.mode <> 'match' or current_booking.status <> 'waiting' then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext('match-deal:' || current_booking.travel_date::text));
  select * into current_booking from public.bookings where id = p_booking_id for update;
  if not found or current_booking.mode <> 'match' or current_booking.status <> 'waiting' or current_booking.match_id is not null then
    return null;
  end if;

  select candidate.* into other_booking
  from public.bookings candidate
  where candidate.id <> current_booking.id
    and candidate.travel_date = current_booking.travel_date
    and candidate.direction <> current_booking.direction
    and candidate.mode = 'match'
    and candidate.status = 'waiting'
    and candidate.match_id is null
    and candidate.cutoff_at > now()
    and current_booking.cutoff_at > now()
    and (
      (current_booking.direction = 'KI' and candidate.direction = 'IK'
        and extract(epoch from (candidate.pickup_time - current_booking.pickup_time)) / 3600.0
          between p_min_gap_hours and p_max_gap_hours)
      or
      (current_booking.direction = 'IK' and candidate.direction = 'KI'
        and extract(epoch from (current_booking.pickup_time - candidate.pickup_time)) / 3600.0
          between p_min_gap_hours and p_max_gap_hours)
    )
  order by abs(extract(epoch from (candidate.pickup_time - current_booking.pickup_time))), candidate.created_at
  limit 1
  for update;

  if not found then return null; end if;

  if current_booking.direction = 'KI' then
    insert into public.matches(booking_out, booking_back, vehicle)
    values (current_booking.id, other_booking.id, 'economy_sedan')
    returning id into new_match_id;
  else
    insert into public.matches(booking_out, booking_back, vehicle)
    values (other_booking.id, current_booking.id, 'economy_sedan')
    returning id into new_match_id;
  end if;

  update public.bookings set status = 'matched', match_id = new_match_id, updated_at = now()
  where id in (current_booking.id, other_booking.id);
  return new_match_id;
end;
$$;

revoke all on function public.try_match_booking(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.try_match_booking(uuid, integer, integer) to service_role;

commit;
