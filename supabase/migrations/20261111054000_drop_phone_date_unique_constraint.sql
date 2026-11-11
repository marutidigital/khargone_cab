-- Drop overly restrictive unique index that prevented passengers from booking multiple cabs or testing bookings on the same date
drop index if exists public.idx_bookings_active_phone_date_dir;
drop index if exists public.bookings_phone_date_active_unique;
