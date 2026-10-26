-- Serialize bookings for one mentor and require 15 minutes between calls.
-- A trigger allows pre-existing close bookings to remain untouched.
create or replace function public.enforce_booking_mentor_gap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status <> 'scheduled' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(lower(new.admin_email))::bigint);

  if exists (
    select 1
    from public.bookings as existing
    where lower(existing.admin_email) = lower(new.admin_email)
      and existing.status = 'scheduled'
      and existing.id is distinct from new.id
      and new.start_at < existing.start_at + (existing.duration_min + 15) * interval '1 minute'
      and existing.start_at < new.start_at + (new.duration_min + 15) * interval '1 minute'
  ) then
    raise exception 'booking_slot_unavailable' using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_mentor_gap on public.bookings;
create trigger bookings_mentor_gap
  before insert or update of admin_email, start_at, duration_min, status
  on public.bookings
  for each row execute function public.enforce_booking_mentor_gap();
