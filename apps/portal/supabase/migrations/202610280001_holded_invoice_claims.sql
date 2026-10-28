-- One durable claim per payment prevents concurrent Holded invoice creation.
create table if not exists public.holded_invoice_claims (
  payment_id uuid primary key references public.payments(id) on delete cascade,
  invoice_data jsonb,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.holded_invoice_claims enable row level security;

create or replace function public.apply_holded_invoice_data(
  p_payment_id uuid,
  p_invoice_data jsonb
) returns boolean
language sql
security invoker
set search_path = public
as $$
  with updated as (
    update public.payments
    set payment_data = coalesce(payment_data, '{}'::jsonb) || p_invoice_data
    where id = p_payment_id
      and jsonb_typeof(p_invoice_data) = 'object'
      and nullif(p_invoice_data->>'holded_invoice_id', '') is not null
      and exists (
        select 1 from public.holded_invoice_claims
        where payment_id = p_payment_id and invoice_data = p_invoice_data
      )
    returning 1
  )
  select exists(select 1 from updated)
$$;

revoke all on public.holded_invoice_claims from anon, authenticated;
grant select, insert, update on public.holded_invoice_claims to service_role;
revoke all on function public.apply_holded_invoice_data(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_holded_invoice_data(uuid, jsonb) to service_role;
