begin;
create table if not exists public.subscription_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(trim(question)) between 1 and 300),
  answer text not null check (char_length(trim(answer)) between 1 and 5000),
  category text not null default 'General',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscription_faqs_order on public.subscription_faqs(published, sort_order, created_at);
alter table public.subscription_faqs enable row level security;
insert into public.subscription_faqs (question, answer, category, sort_order)
select seed.question, seed.answer, 'Suscripción', seed.sort_order
from (values
  ('¿Qué incluye mi suscripción?', 'Todos los servicios marcados como incluidos en el portal: trámites, vivienda, empleo, bienestar y comunidad. Los servicios adicionales se indican expresamente como pago extra.', 10),
  ('¿Puedo cambiar de plan o cancelar?', 'Sí. Desde Pagos puedes abrir el portal seguro de Stripe para gestionar tu plan o cancelarlo. Los cambios se aplican según las condiciones del ciclo de facturación.', 20),
  ('¿Cómo reservo una llamada con mi mentor?', 'Desde Career Support puedes solicitar una llamada con mentor. Nuestro equipo te contactará para agendar la sesión.', 30),
  ('¿Dónde veo mis facturas?', 'En Pagos, pulsa Gestionar pagos y facturas para acceder al portal seguro de Stripe y consultar tu historial.', 40)
) as seed(question, answer, sort_order)
where not exists (select 1 from public.subscription_faqs);
commit;
notify pgrst, 'reload schema';
