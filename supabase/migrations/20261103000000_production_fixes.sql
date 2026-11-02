-- Production fixes for Supabase: booking_ref generator, drop_point constraints, and lead/config tables
begin;

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

alter table public.bookings alter column booking_ref set default public.generate_booking_ref();
grant execute on function public.generate_booking_ref() to anon, authenticated, service_role;

alter table public.bookings drop constraint if exists bookings_drop_point_check;
alter table public.bookings add constraint bookings_drop_point_check
  check (drop_point in ('rajendra', 'railway', 'airport', 'bhawarkua', 'rajwada'));

commit;
