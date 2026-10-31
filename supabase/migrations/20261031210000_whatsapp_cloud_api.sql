begin;

alter table public.bookings
  add column if not exists consent_at timestamptz,
  add column if not exists consent_text text,
  add column if not exists opt_out boolean not null default false,
  add column if not exists last_inbound_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists feedback_due_at timestamptz,
  add column if not exists feedback_sent_at timestamptz;

alter table public.notifications
  add column if not exists recipient_type text not null default 'customer',
  add column if not exists wa_message_id text,
  add column if not exists event_version text not null default 'v1',
  add column if not exists idempotency_key text,
  add column if not exists read_at timestamptz,
  add column if not exists delivered_at timestamptz;
alter table public.notifications alter column booking_id drop not null;
alter table public.payments
  add column if not exists razorpay_payment_link_id text unique,
  add column if not exists payment_link_url text;

alter table public.notifications drop constraint if exists notifications_status_check;
alter table public.notifications
  add constraint notifications_status_check check (status in ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  add constraint notifications_recipient_type_check check (recipient_type in ('customer', 'driver', 'admin'));

create unique index if not exists notifications_idempotency_key_unique
  on public.notifications(idempotency_key) where idempotency_key is not null;
create unique index if not exists notifications_wa_message_id_unique
  on public.notifications(wa_message_id) where wa_message_id is not null;
create index if not exists notifications_sent_status_idx on public.notifications(status, created_at desc);

create table if not exists public.inbound_messages (
  id uuid primary key default gen_random_uuid(),
  wa_message_id text not null unique,
  wa_id text not null,
  text text not null default '',
  message_type text not null default 'text',
  received_at timestamptz not null default now(),
  booking_id uuid references public.bookings(id) on delete set null,
  auto_reply_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists inbound_messages_phone_received_idx on public.inbound_messages(wa_id, received_at desc);
create index if not exists inbound_messages_booking_received_idx on public.inbound_messages(booking_id, received_at desc);

create table if not exists public.whatsapp_phone_preferences (
  wa_id text primary key,
  opt_out boolean not null default false,
  opted_out_at timestamptz,
  last_inbound_at timestamptz,
  last_auto_reply_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_webhook_events (
  wa_message_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

alter table public.inbound_messages enable row level security;
alter table public.whatsapp_phone_preferences enable row level security;
alter table public.whatsapp_webhook_events enable row level security;
revoke all on public.inbound_messages, public.whatsapp_phone_preferences, public.whatsapp_webhook_events from anon, authenticated;
grant select, insert, update, delete on public.inbound_messages, public.whatsapp_phone_preferences, public.whatsapp_webhook_events to service_role;
grant select, insert, update on public.notifications to service_role;

commit;
