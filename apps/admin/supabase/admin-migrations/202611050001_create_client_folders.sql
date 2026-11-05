-- Shared folders for CRM clients and accounts in Alumno, Robin Jr and Community.
-- Apply to ADMIN_SUPABASE_URL. The application APIs use service_role; browser
-- sessions have no direct table access.
create extension if not exists pgcrypto;

create table if not exists public.client_folders (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.client_folders(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 80),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_folders_parent_idx on public.client_folders(parent_id, name);

create table if not exists public.client_folder_items (
  client_key text primary key check (length(client_key) between 5 and 200),
  folder_id uuid not null references public.client_folders(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create index if not exists client_folder_items_folder_idx on public.client_folder_items(folder_id);

alter table public.client_folders enable row level security;
alter table public.client_folder_items enable row level security;
