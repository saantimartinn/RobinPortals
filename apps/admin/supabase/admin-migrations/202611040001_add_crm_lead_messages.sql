-- Las interacciones del lead pueden ser llamadas con duración o mensajes sin ella.
-- Ejecutar en el Supabase administrativo (ADMIN_SUPABASE_URL).

alter table public.crm_lead_calls
  add column if not exists kind text not null default 'call';

alter table public.crm_lead_calls
  alter column duration_minutes drop not null;

alter table public.crm_lead_calls
  drop constraint if exists crm_lead_calls_duration_minutes_check;

alter table public.crm_lead_calls
  drop constraint if exists crm_lead_calls_kind_duration_check;

alter table public.crm_lead_calls
  add constraint crm_lead_calls_kind_duration_check
  check (
    (kind = 'call' and duration_minutes between 1 and 1440)
    or (kind = 'message' and duration_minutes is null)
  );

comment on table public.crm_lead_calls is
  'Historial de llamadas y mensajes comerciales, con notas, fecha y usuario.';
