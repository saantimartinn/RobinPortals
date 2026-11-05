-- Copia administrativa de notas comerciales. No se expone al alumno.
create table if not exists public.crm_client_notes (
  user_id uuid primary key references public.users(id) on delete cascade,
  lead_id text not null,
  notes jsonb not null default '[]'::jsonb check (jsonb_typeof(notes) = 'array'),
  synced_at timestamptz not null default now()
);
alter table public.crm_client_notes enable row level security;
revoke all on public.crm_client_notes from anon, authenticated;
grant select, insert, update, delete on public.crm_client_notes to service_role;
