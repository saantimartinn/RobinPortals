begin;

create table if not exists public.revolut_subscriptions (
  subscriber_id uuid primary key references public.subscribers(id) on delete cascade,
  customer_id text,
  subscription_id text unique,
  setup_order_id text unique,
  plan_key text,
  billing_info jsonb not null default '{}'::jsonb,
  promo_used boolean not null default false,
  state text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.revolut_subscriptions enable row level security;

create table if not exists public.revolut_subscription_invoices (
  order_id text primary key,
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  subscription_id text not null,
  cycle_id text,
  amount numeric not null,
  currency text not null default 'eur',
  paid_at timestamptz not null,
  billing_status text not null default 'pending',
  holded_invoice_id text,
  holded_invoice_number text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_revolut_subscription_invoices_subscriber
  on public.revolut_subscription_invoices(subscriber_id, paid_at desc);
alter table public.revolut_subscription_invoices enable row level security;

commit;
notify pgrst, 'reload schema';
