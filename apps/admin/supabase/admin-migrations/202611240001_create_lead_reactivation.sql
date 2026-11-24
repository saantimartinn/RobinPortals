-- CRM administrative database. Installing this migration never activates sends.
begin;

create table if not exists public.crm_reactivation_settings (
  campaign_id text primary key check (campaign_id = 'holanda-inactive-30d-v1'),
  enabled boolean not null default false,
  activated_at timestamptz,
  confirmed_holanda_lead_ids uuid[] not null default '{}',
  consent_basis text not null default 'Questionnaire acceptance confirmed by the owner on 2026-11-24',
  updated_at timestamptz not null default now(),
  last_run_at timestamptz,
  last_error text
);
insert into public.crm_reactivation_settings (campaign_id) values ('holanda-inactive-30d-v1') on conflict do nothing;

create table if not exists public.crm_email_suppressions (
  email text primary key check (email = lower(trim(email))),
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_lead_reactivations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  campaign_id text not null default 'holanda-inactive-30d-v1' references public.crm_reactivation_settings(campaign_id),
  email text not null check (email = lower(trim(email))),
  original_campaign text,
  status text not null default 'active' check (status in ('active', 'stopped', 'completed')),
  stop_reason text,
  enrolled_at timestamptz not null default now(),
  stopped_at timestamptz,
  unique (lead_id, campaign_id),
  unique (email, campaign_id)
);

create table if not exists public.crm_lead_reactivation_messages (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.crm_lead_reactivations(id) on delete cascade,
  message_number integer not null check (message_number between 1 and 8),
  template text not null,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'sending', 'sent', 'failed', 'review', 'cancelled')),
  provider_message_id text,
  delivery_status text,
  error text,
  payload jsonb,
  first_attempt_at timestamptz,
  claimed_until timestamptz,
  attempts integer not null default 0,
  unique (enrollment_id, message_number)
);
create index if not exists crm_reactivation_due_idx on public.crm_lead_reactivation_messages(scheduled_at) where status in ('scheduled', 'failed', 'sending');

alter table public.crm_reactivation_settings enable row level security;
alter table public.crm_email_suppressions enable row level security;
alter table public.crm_lead_reactivations enable row level security;
alter table public.crm_lead_reactivation_messages enable row level security;
revoke all on public.crm_reactivation_settings, public.crm_email_suppressions, public.crm_lead_reactivations, public.crm_lead_reactivation_messages from anon, authenticated;
grant all on public.crm_reactivation_settings, public.crm_email_suppressions, public.crm_lead_reactivations, public.crm_lead_reactivation_messages to service_role;

-- One transaction owns enrollment, its eight messages and the website booking marker.
create or replace function public.enroll_lead_reactivation(p_lead_id uuid, p_email text, p_start_on date)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_lead public.crm_leads; v_email text := lower(trim(p_email));
begin
  select * into v_lead from public.crm_leads where id = p_lead_id for update;
  if not found or lower(trim(v_lead.email)) <> v_email then return null; end if;
  if not exists (select 1 from public.crm_reactivation_settings where campaign_id = 'holanda-inactive-30d-v1' and enabled and activated_at is not null) then return null; end if;
  if exists (select 1 from public.crm_email_suppressions where email = v_email) then return null; end if;
  if coalesce(v_lead.crm_stage, 'Por contactar') <> 'Por contactar' or cardinality(v_lead.owner_names) > 0 or v_lead.contact_at is not null or v_lead.inside_at is not null or v_lead.is_test then return null; end if;
  if coalesce(v_lead.source_created_at, v_lead.created_at) >= now() - interval '30 days' then return null; end if;
  if exists (select 1 from public.crm_lead_calls where lead_id = p_lead_id) then return null; end if;
  insert into public.crm_lead_reactivations(lead_id, email, original_campaign)
  values (p_lead_id, v_email, coalesce(v_lead.source_payload->>'campaign_name', v_lead.campaign_notion_urls[1]))
  on conflict do nothing returning id into v_id;
  if v_id is null then return null; end if;
  insert into public.crm_lead_reactivation_messages(enrollment_id, message_number, template, scheduled_at)
  select v_id, n, slug, ((p_start_on + days) + time '20:00') at time zone 'Europe/Madrid'
  from (values (1,0,'retomar_plan'),(2,4,'precio_real'),(3,9,'carrera_correcta'),(4,15,'fechas'),(5,22,'admision'),(6,30,'alojamiento'),(7,39,'admitidos'),(8,49,'cierre')) as pieces(n,days,slug);
  update public.crm_leads set source_payload = coalesce(source_payload, '{}'::jsonb) || jsonb_build_object('reactivation_30d', jsonb_build_object('campaign_id', 'holanda-inactive-30d-v1', 'enrollment_id', v_id, 'enrolled_at', now())) where id = p_lead_id;
  return v_id;
end $$;

-- Durable claim + immutable payload. Provider idempotency lasts 24h: an uncertain
-- send is never retried beyond 23h, even after an outage or an overlapping cron.
create or replace function public.claim_lead_reactivation_message(p_message_id uuid, p_payload jsonb)
returns setof public.crm_lead_reactivation_messages language plpgsql security invoker set search_path = public as $$
declare v_message public.crm_lead_reactivation_messages; v_enrollment public.crm_lead_reactivations; v_lead public.crm_leads; v_last_sent timestamptz; v_gap integer;
begin
  select * into v_message from public.crm_lead_reactivation_messages where id = p_message_id;
  if not found then return; end if;
  -- Use the same enrollment -> lead -> message lock order as stop/booking.
  select * into v_enrollment from public.crm_lead_reactivations where id = v_message.enrollment_id for update;
  if v_enrollment.status <> 'active' then return; end if;
  select * into v_lead from public.crm_leads where id = v_enrollment.lead_id for update;
  if not found or lower(trim(v_lead.email)) <> v_enrollment.email then return; end if;
  select * into v_message from public.crm_lead_reactivation_messages where id = p_message_id for update;
  if not found or v_message.status not in ('scheduled','failed','sending') or v_message.scheduled_at > now() then return; end if;
  if v_message.claimed_until > now() then return; end if;
  if v_message.first_attempt_at < now() - interval '23 hours' then
    update public.crm_lead_reactivation_messages set status = 'review', error = 'idempotency_window_expired' where id = p_message_id;
    return;
  end if;
  if not exists (select 1 from public.crm_reactivation_settings where campaign_id = v_enrollment.campaign_id and enabled and activated_at is not null) then return; end if;
  if coalesce(v_lead.crm_stage, 'Por contactar') <> 'Por contactar' or cardinality(v_lead.owner_names) > 0 or v_lead.contact_at is not null or v_lead.inside_at is not null or v_lead.is_test or v_lead.source_payload ? 'retargeting_reservation' then return; end if;
  if exists (select 1 from public.crm_email_suppressions where email = v_enrollment.email) or exists (select 1 from public.crm_lead_calls where lead_id = v_lead.id) then return; end if;
  if exists (select 1 from public.crm_lead_reactivation_messages where enrollment_id = v_enrollment.id and message_number < v_message.message_number and status <> 'sent') then return; end if;
  -- After downtime, keep the handoff's minimum interval rather than catching up
  -- with several old pieces at once. Normal operation retains the original dates.
  select max(sent_at) into v_last_sent from public.crm_lead_reactivation_messages where enrollment_id = v_enrollment.id;
  v_gap := case v_message.message_number when 2 then 4 when 3 then 5 when 4 then 6 when 5 then 7 when 6 then 8 when 7 then 9 when 8 then 10 else 0 end;
  if v_last_sent is not null and (now() at time zone 'Europe/Madrid')::date < (v_last_sent at time zone 'Europe/Madrid')::date + v_gap then return; end if;
  return query update public.crm_lead_reactivation_messages set status = 'sending', payload = coalesce(payload, p_payload), first_attempt_at = coalesce(first_attempt_at, now()), claimed_until = now() + interval '10 minutes', attempts = attempts + 1, error = null where id = p_message_id returning *;
end $$;

create or replace function public.stop_lead_reactivation(p_enrollment_id uuid, p_reason text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.crm_lead_reactivations set status = 'stopped', stop_reason = p_reason, stopped_at = now() where id = p_enrollment_id and status = 'active';
  update public.crm_lead_reactivation_messages set status = 'cancelled', error = p_reason where enrollment_id = p_enrollment_id and status in ('scheduled','failed');
end $$;

create or replace function public.reactivate_lead_booking(p_enrollment_id uuid, p_booking jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare v_enrollment public.crm_lead_reactivations;
begin
  select * into v_enrollment from public.crm_lead_reactivations where id = p_enrollment_id for update;
  if not found then return; end if;
  update public.crm_leads set source_payload = coalesce(source_payload, '{}'::jsonb) || jsonb_build_object('retargeting_reservation', p_booking || jsonb_build_object('campaign_id', v_enrollment.campaign_id, 'email', v_enrollment.email)) where id = v_enrollment.lead_id;
  perform public.stop_lead_reactivation(p_enrollment_id, 'booking');
end $$;

create or replace function public.suppress_reactivation_email(p_email text, p_reason text)
returns void language plpgsql security invoker set search_path = public as $$
declare item record; v_email text := lower(trim(p_email));
begin
  insert into public.crm_email_suppressions(email,reason) values(v_email,p_reason) on conflict (email) do nothing;
  for item in select id from public.crm_lead_reactivations where email = v_email and status = 'active' loop
    perform public.stop_lead_reactivation(item.id, p_reason);
  end loop;
end $$;

-- Tags identify the pre-existing message even if delivery arrives before the
-- sender persists its API response. Other transactional emails are not recorded.
create or replace function public.record_reactivation_email_event(p_message_id uuid, p_provider_id text, p_status text, p_email text)
returns void language plpgsql security invoker set search_path = public as $$
declare v_enrollment public.crm_lead_reactivations; v_message public.crm_lead_reactivation_messages;
begin
  if p_status not in ('delivered','bounced','complained','suppressed','failed') then return; end if;
  select * into v_message from public.crm_lead_reactivation_messages where id = p_message_id;
  if not found then return; end if;
  select * into v_enrollment from public.crm_lead_reactivations where id = v_message.enrollment_id;
  if v_enrollment.email <> lower(trim(p_email)) then return; end if;
  if v_message.provider_message_id is not null and v_message.provider_message_id <> p_provider_id then return; end if;
  if p_status <> 'delivered' then perform public.suppress_reactivation_email(v_enrollment.email, p_status); end if;
  update public.crm_lead_reactivation_messages set provider_message_id = coalesce(provider_message_id, p_provider_id), delivery_status = p_status where id = p_message_id and (provider_message_id is null or provider_message_id = p_provider_id) and (p_status <> 'delivered' or delivery_status is null or delivery_status not in ('bounced','complained','suppressed','failed'));
end $$;

revoke execute on function public.enroll_lead_reactivation(uuid,text,date), public.claim_lead_reactivation_message(uuid,jsonb), public.stop_lead_reactivation(uuid,text), public.reactivate_lead_booking(uuid,jsonb), public.suppress_reactivation_email(text,text), public.record_reactivation_email_event(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.enroll_lead_reactivation(uuid,text,date), public.claim_lead_reactivation_message(uuid,jsonb), public.stop_lead_reactivation(uuid,text), public.reactivate_lead_booking(uuid,jsonb), public.suppress_reactivation_email(text,text), public.record_reactivation_email_event(uuid,text,text,text) to service_role;
commit;
