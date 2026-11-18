-- Preserve existing bookings; serialize new future bookings for each student.
create or replace function public.enforce_booking_student_pending()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status <> 'scheduled' or new.start_at <= now() then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('booking_user:' || new.user_id::text)::bigint);

  if exists (
    select 1
    from public.bookings as existing
    where existing.user_id = new.user_id
      and existing.status = 'scheduled'
      and existing.start_at > now()
      and existing.id is distinct from new.id
  ) then
    raise exception 'booking_pending' using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_student_pending on public.bookings;
create trigger bookings_student_pending
  before insert or update of user_id, start_at, status
  on public.bookings
  for each row execute function public.enforce_booking_student_pending();
