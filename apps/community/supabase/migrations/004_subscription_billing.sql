-- SQL change for 004 subscription billing; apply it only to the Supabase project that owns this migration.
begin;

alter table public.subscribers
  add column if not exists portal_user_id uuid,
  add column if not exists holded_contact_id text,
  add column if not exists billing_link_method text,
  add column if not exists billing_linked_at timestamptz;

create index if not exists idx_subscribers_portal_user on public.subscribers(portal_user_id);

create table if not exists public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.subscribers(id) on delete set null,
  stripe_invoice_id text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  amount numeric not null default 0,
  currency text not null default 'eur',
  paid_at timestamptz,
  status text not null default 'paid',
  billing_status text not null default 'pending',
  portal_user_id uuid,
  holded_contact_id text,
  holded_invoice_id text,
  holded_invoice_number text,
  match_method text,
  match_details jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscription_invoices_subscriber on public.subscription_invoices(subscriber_id, created_at desc);
create index if not exists idx_subscription_invoices_billing on public.subscription_invoices(billing_status, created_at desc);
alter table public.subscription_invoices enable row level security;

commit;
notify pgrst, 'reload schema';
