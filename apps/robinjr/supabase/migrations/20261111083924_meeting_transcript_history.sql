-- Private durable intake and per-meeting history. Browser roles have no access.
create table if not exists public.meeting_transcripts (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  source text not null check (source in ('drive','meet','manual')),
  advisor_email text not null,
  user_id uuid references public.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  title text not null default 'Reunión',
  meeting_at timestamptz not null,
  raw_text text,
  summary text,
  status text not null default 'queued' check (status in ('queued','processing','completed','unmatched','failed')),
  attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  retry_at timestamptz not null default now(),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.meeting_transcripts enable row level security;
revoke all on public.meeting_transcripts from public, anon, authenticated;
grant all on public.meeting_transcripts to service_role;
create index if not exists meeting_transcripts_work on public.meeting_transcripts(status,retry_at);
create index if not exists meeting_transcripts_user_date on public.meeting_transcripts(user_id,meeting_at desc);

create or replace function public.claim_meeting_transcripts(p_limit integer default 5)
returns setof public.meeting_transcripts
language sql security invoker set search_path = public, pg_temp as $$
  with candidates as (
    select id from public.meeting_transcripts
    where (status in ('queued','failed','unmatched') and attempts < 8 and retry_at <= now())
       or (status = 'processing' and lease_until < now())
    order by meeting_at, created_at
    limit least(greatest(p_limit,1),10)
    for update skip locked
  )
  update public.meeting_transcripts m set
    status='processing', attempts=m.attempts+1, lease_token=gen_random_uuid(),
    lease_until=now()+interval '12 minutes', updated_at=now(), error_code=null
  from candidates c where m.id=c.id returning m.*;
$$;
revoke all on function public.claim_meeting_transcripts(integer) from public, anon, authenticated;
grant execute on function public.claim_meeting_transcripts(integer) to service_role;

create or replace function public.complete_meeting_transcript(
  p_id uuid, p_lease_token uuid, p_user_id uuid, p_booking_id uuid,
  p_summary text, p_raw_text text, p_title text, p_meeting_at timestamptz
)
returns text language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  item public.meeting_transcripts%rowtype;
  previous text;
  entry text;
  updated_history text;
begin
  select * into item from public.meeting_transcripts where id=p_id for update;
  if not found then raise exception 'meeting_not_found'; end if;
  if item.status='completed' then
    select historial into updated_history from public.users where id=item.user_id;
    return updated_history;
  end if;
  if item.status <> 'processing' or item.lease_token is distinct from p_lease_token
    or item.lease_until < now() then raise exception 'meeting_lease_lost'; end if;
  if nullif(trim(p_summary),'') is null or nullif(trim(p_raw_text),'') is null then
    raise exception 'empty_meeting';
  end if;
  -- Lock the student as well: two different meetings cannot overwrite each other.
  select coalesce(historial,'') into previous from public.users where id=p_user_id for update;
  if not found then raise exception 'meeting_user_not_found'; end if;
  entry := '## ' || to_char(p_meeting_at at time zone 'UTC','YYYY-MM-DD')
    || ' · ' || replace(replace(p_title, E'\n',' '), E'\r',' ') || E'\n' || p_summary;
  updated_history := entry || case when previous='' then '' else E'\n\n' || previous end;
  update public.users set historial=updated_history, historial_updated_at=now() where id=p_user_id;
  update public.meeting_transcripts set user_id=p_user_id, booking_id=p_booking_id,
    summary=p_summary, raw_text=p_raw_text, title=p_title, meeting_at=p_meeting_at,
    status='completed', completed_at=now(), updated_at=now(), lease_until=null, error_code=null
    where id=p_id;
  if item.external_id like 'drive:%' then
    insert into public.processed_meet_docs(file_id,user_id)
    values(substring(item.external_id from 7),p_user_id)
    on conflict(file_id) do update set user_id=excluded.user_id;
  end if;
  return updated_history;
end;
$$;
revoke all on function public.complete_meeting_transcript(uuid,uuid,uuid,uuid,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.complete_meeting_transcript(uuid,uuid,uuid,uuid,text,text,text,timestamptz) to service_role;
