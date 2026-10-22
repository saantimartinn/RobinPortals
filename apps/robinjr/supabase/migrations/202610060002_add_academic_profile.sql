-- SQL change for 202610060002 add academic profile; apply it only to the Supabase project that owns this migration.
alter table public.users
  add column if not exists academic_system text,
  add column if not exists academic_subjects jsonb not null default '[]'::jsonb;

comment on column public.users.academic_system is
  'Sistema académico cursado por el alumno durante el onboarding.';

comment on column public.users.academic_subjects is
  'Asignaturas del alumno y, cuando corresponde, su nivel académico.';
