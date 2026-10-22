-- SQL change for 202610060003 create birthday notifications; apply it only to the Supabase project that owns this migration.
alter table public.notifications
  add column if not exists event_kind text not null default 'general',
  add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_key_unique
  on public.notifications (dedupe_key);

create table if not exists public.birthday_events (
  user_id uuid not null references public.users(id) on delete cascade,
  birthday_year integer not null check (birthday_year between 2000 and 2200),
  notification_id text,
  advisor_email text,
  advisor_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, birthday_year)
);

alter table public.birthday_events enable row level security;

comment on table public.birthday_events is
  'Control idempotente de felicitaciones anuales y del aviso por email al asesor.';
