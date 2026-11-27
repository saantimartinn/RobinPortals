create table if not exists public.mobile_push_devices (
  token text primary key check (token ~ '^[0-9a-f]{32,512}$' and length(token) % 2 = 0),
  user_id uuid not null references public.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mobile_push_devices_user_idx on public.mobile_push_devices(user_id) where enabled;
alter table public.mobile_push_devices enable row level security;

create table if not exists public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  type text not null default 'info',
  audience jsonb not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','cancelled','failed')),
  processing_started_at timestamptz,
  is_immediate boolean not null default false,
  push_accepted integer not null default 0,
  push_rejected integer not null default 0,
  push_review integer not null default 0,
  created_by text not null,
  notification_id uuid references public.notifications(id),
  created_at timestamptz not null default now()
);
create index if not exists scheduled_notifications_due_idx on public.scheduled_notifications(scheduled_at) where status = 'pending';
alter table public.scheduled_notifications enable row level security;

create table if not exists public.mobile_push_deliveries (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  token text not null,
  status text not null check (status in ('claimed','accepted','rejected','review')),
  apns_status integer,
  apns_reason text,
  created_at timestamptz not null default now(),
  primary key (notification_id, token)
);
alter table public.mobile_push_deliveries enable row level security;
