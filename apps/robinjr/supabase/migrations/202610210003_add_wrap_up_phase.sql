-- Add Robin Jr's Wrap up phase as phase 9.
begin;

do $$
declare phase_check record;
begin
  for phase_check in
    select conname
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%application_phase%'
  loop
    execute format('alter table public.users drop constraint %I', phase_check.conname);
  end loop;
end
$$;

alter table public.users
  add constraint users_application_phase_range_check
  check (application_phase is null or application_phase between 1 and 9);

commit;
