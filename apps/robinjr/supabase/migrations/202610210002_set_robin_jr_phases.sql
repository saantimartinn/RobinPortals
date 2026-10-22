-- Robin Jr uses eight phases. Keep existing records on the final step when
-- normalizing values from the previous nine-phase application flow.
begin;

update public.users
set application_phase = 8,
    phase_changed_at = now()
where application_phase > 8;

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
  check (application_phase is null or application_phase between 1 and 8);

commit;
