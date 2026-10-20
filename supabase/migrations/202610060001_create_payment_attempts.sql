-- SQL change for 202610060001 create payment attempts; apply it only to the Supabase project that owns this migration.
create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  kind text not null check (kind in ('onboarding', 'installment')),
  provider text not null check (provider in ('stripe', 'revolut')),
  provider_order_id text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,
  status text not null default 'created',
  checkout_url text,
  provider_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists payment_attempts_provider_order_uidx
  on public.payment_attempts(provider, provider_order_id)
  where provider_order_id is not null;

create index if not exists payment_attempts_user_created_idx
  on public.payment_attempts(user_id, created_at desc);

alter table public.payment_attempts enable row level security;

comment on table public.payment_attempts is
  'Server-only correlation and idempotency records for hosted payment-provider checkouts.';
