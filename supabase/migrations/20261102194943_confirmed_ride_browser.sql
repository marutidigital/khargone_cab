begin;

create table if not exists public.booking_match_reservations (
  candidate_booking_id uuid primary key references public.bookings(id) on delete cascade,
  requester_booking_id uuid not null unique references public.bookings(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists booking_match_reservations_expiry_idx
  on public.booking_match_reservations(expires_at);

alter table public.booking_match_reservations enable row level security;
revoke all on public.booking_match_reservations from anon, authenticated;
grant select, insert, update, delete on public.booking_match_reservations to service_role;

create or replace function public.reserve_match_candidate(
  p_requester_booking_id uuid,
  p_candidate_booking_id uuid,
  p_hold_minutes integer default 15
)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  requester public.bookings%rowtype;
  candidate public.bookings%rowtype;
  target_date date;
begin
  select travel_date into target_date
  from public.bookings where id = p_requester_booking_id;
  if not found then return false; end if;

  perform pg_advisory_xact_lock(hashtext('match-deal:' || target_date::text));

  select * into requester
  from public.bookings where id = p_requester_booking_id for update;
  if not found or requester.mode <> 'match' or requester.status not in ('pending_payment', 'waiting') then
    return false;
  end if;

  select * into candidate
  from public.bookings where id = p_candidate_booking_id for update;
  if not found
    or candidate.mode <> 'match'
    or candidate.status <> 'waiting'
    or candidate.match_id is not null
    or candidate.travel_date <> requester.travel_date
    or candidate.drop_point <> requester.drop_point
    or candidate.direction = requester.direction
    or candidate.cutoff_at is null
    or candidate.cutoff_at <= now()
    or requester.cutoff_at is null
    or requester.cutoff_at <= now()
  then
    return false;
  end if;

  if not (
    (requester.direction = 'KI' and candidate.direction = 'IK'
      and extract(epoch from (candidate.pickup_time - requester.pickup_time)) / 3600.0 between 4 and 8)
    or
    (requester.direction = 'IK' and candidate.direction = 'KI'
      and extract(epoch from (requester.pickup_time - candidate.pickup_time)) / 3600.0 between 4 and 8)
  ) then
    return false;
  end if;

  delete from public.booking_match_reservations where expires_at <= now();
  insert into public.booking_match_reservations(candidate_booking_id, requester_booking_id, expires_at)
  values (
    candidate.id,
    requester.id,
    now() + make_interval(mins => least(greatest(coalesce(p_hold_minutes, 15), 1), 30))
  )
  on conflict do nothing;

  return found;
end;
$$;

create or replace function public.release_match_reservation(p_requester_booking_id uuid)
returns void
language sql
set search_path = public, pg_temp
as $$
  delete from public.booking_match_reservations
  where requester_booking_id = p_requester_booking_id;
$$;

create or replace function public.confirm_reserved_match(p_requester_booking_id uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  requester public.bookings%rowtype;
  candidate public.bookings%rowtype;
  target_date date;
  new_match_id uuid;
begin
  select travel_date into target_date
  from public.bookings where id = p_requester_booking_id;
  if not found then return null; end if;

  perform pg_advisory_xact_lock(hashtext('match-deal:' || target_date::text));

  select b.* into requester
  from public.bookings b
  where b.id = p_requester_booking_id
  for update;
  if not found then return null; end if;

  select b.* into candidate
  from public.booking_match_reservations r
  join public.bookings b on b.id = r.candidate_booking_id
  where r.requester_booking_id = p_requester_booking_id
    and r.expires_at > now()
  for update of b;
  if not found then return null; end if;

  if requester.mode <> 'match' or requester.status <> 'waiting' or requester.match_id is not null
    or candidate.mode <> 'match' or candidate.status <> 'waiting' or candidate.match_id is not null
    or candidate.travel_date <> requester.travel_date
    or candidate.drop_point <> requester.drop_point
    or candidate.direction = requester.direction
    or candidate.cutoff_at is null or candidate.cutoff_at <= now()
    or requester.cutoff_at is null or requester.cutoff_at <= now()
  then
    delete from public.booking_match_reservations where requester_booking_id = p_requester_booking_id;
    return null;
  end if;

  if not (
    (requester.direction = 'KI' and candidate.direction = 'IK'
      and extract(epoch from (candidate.pickup_time - requester.pickup_time)) / 3600.0 between 4 and 8)
    or
    (requester.direction = 'IK' and candidate.direction = 'KI'
      and extract(epoch from (requester.pickup_time - candidate.pickup_time)) / 3600.0 between 4 and 8)
  ) then
    delete from public.booking_match_reservations where requester_booking_id = p_requester_booking_id;
    return null;
  end if;

  if requester.direction = 'KI' then
    insert into public.matches(booking_out, booking_back, vehicle)
    values (requester.id, candidate.id, 'economy_sedan')
    returning id into new_match_id;
  else
    insert into public.matches(booking_out, booking_back, vehicle)
    values (candidate.id, requester.id, 'economy_sedan')
    returning id into new_match_id;
  end if;

  update public.bookings
  set status = 'matched', match_id = new_match_id, updated_at = now()
  where id in (requester.id, candidate.id);

  delete from public.booking_match_reservations
  where requester_booking_id = p_requester_booking_id
    or candidate_booking_id = candidate.id;

  return new_match_id;
end;
$$;

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
  if exists (
    select 1 from public.booking_match_reservations r
    where r.requester_booking_id = p_booking_id and r.expires_at > now()
  ) then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext('match-deal:' || current_booking.travel_date::text));
  select * into current_booking from public.bookings where id = p_booking_id for update;
  if not found or current_booking.mode <> 'match' or current_booking.status <> 'waiting' or current_booking.match_id is not null then
    return null;
  end if;
  if exists (
    select 1 from public.booking_match_reservations r
    where r.requester_booking_id = p_booking_id and r.expires_at > now()
  ) then
    return null;
  end if;

  select candidate.* into other_booking
  from public.bookings candidate
  where candidate.id <> current_booking.id
    and candidate.travel_date = current_booking.travel_date
    and candidate.direction <> current_booking.direction
    and candidate.drop_point = current_booking.drop_point
    and candidate.mode = 'match'
    and candidate.status = 'waiting'
    and candidate.match_id is null
    and candidate.cutoff_at > now()
    and current_booking.cutoff_at > now()
    and not exists (
      select 1 from public.booking_match_reservations r
      where r.candidate_booking_id = candidate.id and r.expires_at > now()
    )
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
  delete from public.booking_match_reservations
  where requester_booking_id in (current_booking.id, other_booking.id)
    or candidate_booking_id in (current_booking.id, other_booking.id);
  return new_match_id;
end;
$$;

revoke all on function public.reserve_match_candidate(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.release_match_reservation(uuid) from public, anon, authenticated;
revoke all on function public.confirm_reserved_match(uuid) from public, anon, authenticated;
revoke all on function public.try_match_booking(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_match_candidate(uuid, uuid, integer) to service_role;
grant execute on function public.release_match_reservation(uuid) to service_role;
grant execute on function public.confirm_reserved_match(uuid) to service_role;
grant execute on function public.try_match_booking(uuid, integer, integer) to service_role;

commit;
