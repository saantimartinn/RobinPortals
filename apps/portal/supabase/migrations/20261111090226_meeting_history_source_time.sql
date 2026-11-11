-- Distinguish an authoritative call time from a document created after the call.
alter table public.meeting_transcripts
  add column if not exists meeting_at_source text not null default 'document'
  check (meeting_at_source in ('document','conference','manual'));

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
  entry := '## ' || case when item.meeting_at_source='document' then 'Fecha del documento: ' else '' end || to_char(p_meeting_at at time zone 'UTC','YYYY-MM-DD')
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
