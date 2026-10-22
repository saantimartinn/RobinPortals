-- Add Robin Jr career card content and per-document deadlines.
begin;

alter table public.career_templates
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists image_path text;

alter table public.documents
  add column if not exists deadline date;

commit;
