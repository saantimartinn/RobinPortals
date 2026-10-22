-- ============================================================
-- THE ROBIN PLAN · Esquema STANDALONE (base de datos independiente)
-- Crea desde cero, en un proyecto Supabase NUEVO y separado, todo el mundo
-- suscriptor. NO depende de la tabla `users` del portal de aplicación:
-- todas las FKs apuntan a `subscribers`.
--
-- Idempotente y transaccional. Ejecutar en el SQL Editor de Supabase del
-- proyecto NUEVO de The Robin Plan.
-- ============================================================

begin;

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ------------------------------------------------------------
-- 1) subscribers (raíz del mundo suscriptor)
-- ------------------------------------------------------------
create table if not exists public.subscribers (
  id                       uuid primary key default gen_random_uuid(),
  lead_id                  text,
  username                 text unique,
  email                    text unique,
  password_hash            text,
  role                     text not null default 'subscriber',   -- subscriber | subscriber_admin
  tc_accepted_at           timestamptz,
  nombre                   text,
  apellidos                text,
  ciudad                   text,
  avatar_url               text,
  is_subscriber            boolean not null default true,
  subscription_plan        text,                                  -- monthly | annual | null
  subscription_status      text not null default 'none',          -- none|active|trialing|past_due|canceled|paused
  subscription_started_at  timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  bonus_days               int not null default 0,
  discount_code            text,
  discount_percent         numeric,
  discount_duration_months int,                                   -- null = ilimitado
  profile_extra            jsonb,
  robin_level_override     text,
  created_at               timestamptz not null default now()
);
create index if not exists idx_subscribers_email  on public.subscribers(email);
create index if not exists idx_subscribers_stripe on public.subscribers(stripe_customer_id);
create index if not exists idx_subscribers_sub    on public.subscribers(stripe_subscription_id);
alter table public.subscribers enable row level security;

-- ------------------------------------------------------------
-- 2) partners (catálogo, sin FK a usuario)
-- ------------------------------------------------------------
create table if not exists public.partners (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text not null,
  city          text,
  description   text,
  benefits      text,
  discount      text,
  contact_url   text,
  booking_url   text,
  eligibility   text,
  logo_url      text,
  active        boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_partners_category on public.partners(category);
create index if not exists idx_partners_active   on public.partners(active);
alter table public.partners enable row level security;

-- ------------------------------------------------------------
-- 3) community_events (con enriquecido por ciudad) + event_rsvps
-- ------------------------------------------------------------
create table if not exists public.community_events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  type          text not null,   -- event | trip | party | sports | group | networking | announcement
  description   text,
  location      text,
  starts_at     timestamptz,
  ends_at       timestamptz,
  capacity      int,
  image_url     text,
  active        boolean not null default true,
  city          text,            -- null = Nacional (lo ven todos)
  expires_at    timestamptz,
  meta          jsonb not null default '{}'::jsonb,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_events_type   on public.community_events(type);
create index if not exists idx_events_starts on public.community_events(starts_at);
create index if not exists idx_events_city   on public.community_events(city);
alter table public.community_events enable row level security;

create table if not exists public.event_rsvps (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.community_events(id) on delete cascade,
  user_id      uuid not null references public.subscribers(id) on delete cascade,
  status       text not null default 'going',
  created_at   timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists idx_rsvps_user  on public.event_rsvps(user_id);
create index if not exists idx_rsvps_event on public.event_rsvps(event_id);
alter table public.event_rsvps enable row level security;

-- ------------------------------------------------------------
-- 4) service_requests (solo suscriptores en este mundo)
-- ------------------------------------------------------------
create table if not exists public.service_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.subscribers(id) on delete cascade,
  service_key   text,
  category      text,
  title         text not null,
  details       text,
  status        text not null default 'open',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_srv_req_user   on public.service_requests(user_id);
create index if not exists idx_srv_req_status on public.service_requests(status);
alter table public.service_requests enable row level security;

-- ------------------------------------------------------------
-- 5) notifications + notification_recipients
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  type text not null default 'info',       -- info | terms
  created_by text,
  created_at timestamptz default now()
);
create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.subscribers(id) on delete cascade,
  status text not null default 'pending',
  seen_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz default now(),
  unique (notification_id, user_id)
);
create index if not exists idx_notif_recipients_user  on public.notification_recipients(user_id, status);
create index if not exists idx_notif_recipients_notif on public.notification_recipients(notification_id);
alter table public.notifications enable row level security;
alter table public.notification_recipients enable row level security;

-- ------------------------------------------------------------
-- 6) discount_codes (con duración) + suscriptor hereda duration
-- ------------------------------------------------------------
create table if not exists public.discount_codes (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  percent_off      numeric not null check (percent_off > 0 and percent_off <= 100),
  active           boolean not null default true,
  max_redemptions  int,
  times_redeemed   int not null default 0,
  note             text,
  duration_months  int,
  created_at       timestamptz not null default now(),
  constraint discount_codes_duration_months_check
    check (duration_months is null or (duration_months between 1 and 12))
);
create unique index if not exists uq_discount_codes_code on public.discount_codes (upper(code));
alter table public.discount_codes enable row level security;

-- ------------------------------------------------------------
-- 7) friendships + direct_messages
-- ------------------------------------------------------------
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.subscribers(id) on delete cascade,
  addressee_id  uuid not null references public.subscribers(id) on delete cascade,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  unique (requester_id, addressee_id)
);
create index if not exists idx_friend_req  on public.friendships(requester_id);
create index if not exists idx_friend_addr on public.friendships(addressee_id);
alter table public.friendships enable row level security;

create table if not exists public.direct_messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.subscribers(id) on delete cascade,
  recipient_id  uuid not null references public.subscribers(id) on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index if not exists idx_dm_pair      on public.direct_messages(sender_id, recipient_id);
create index if not exists idx_dm_recipient on public.direct_messages(recipient_id);
alter table public.direct_messages enable row level security;

-- ------------------------------------------------------------
-- 8) challenges + challenge_submissions
-- ------------------------------------------------------------
create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  advance_days  int not null default 0,
  files         jsonb not null default '[]'::jsonb,
  questions     jsonb not null default '[]'::jsonb,
  active        boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
alter table public.challenges enable row level security;

create table if not exists public.challenge_submissions (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  user_id       uuid not null references public.subscribers(id) on delete cascade,
  answers       jsonb not null default '{}'::jsonb,
  files         jsonb not null default '[]'::jsonb,
  status        text not null default 'pending',
  note          text,
  created_at    timestamptz not null default now(),
  validated_at  timestamptz,
  unique (challenge_id, user_id)
);
create index if not exists idx_subm_user   on public.challenge_submissions(user_id);
create index if not exists idx_subm_status on public.challenge_submissions(status);
alter table public.challenge_submissions enable row level security;

-- ------------------------------------------------------------
-- 9) webhook_log (trazabilidad de Stripe / email)
-- ------------------------------------------------------------
create table if not exists public.webhook_log (
  id          uuid primary key default gen_random_uuid(),
  source      text,
  payload     jsonb,
  result      text,
  message     text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_webhook_log_created on public.webhook_log(created_at);
alter table public.webhook_log enable row level security;

commit;
notify pgrst, 'reload schema';
