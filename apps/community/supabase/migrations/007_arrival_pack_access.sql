begin;

-- No subscriber/account is created for a Pack Llegada client. This UUID belongs
-- to the Portal database, so it deliberately has no cross-database foreign key.
alter table public.service_requests alter column user_id drop not null;
alter table public.service_requests add column if not exists portal_user_id uuid;
alter table public.service_requests add column if not exists requester_name text;
alter table public.service_requests add constraint service_requests_one_owner
  check ((user_id is not null)::integer + (portal_user_id is not null)::integer = 1);
create index if not exists idx_srv_req_portal_user on public.service_requests(portal_user_id) where portal_user_id is not null;

-- Existing FAQs keep their current Community audience. Operators explicitly
-- choose which approved answers are applicable to Pack Llegada.
alter table public.subscription_faqs add column if not exists products text[] not null default array['community'];
alter table public.subscription_faqs add constraint subscription_faqs_products
  check (cardinality(products) > 0 and products <@ array['community', 'pack_llegada']::text[]);

commit;
notify pgrst, 'reload schema';
