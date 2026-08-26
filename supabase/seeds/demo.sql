-- OPCIONAL: solo desarrollo; nunca ejecutar automáticamente en producción.
begin;
insert into public.partners (name, category, city, description, benefits, discount, contact_url, eligibility, sort_order)
select * from (values
  ('NL Bike Rental', 'bike', 'Rotterdam', 'Alquiler y venta de bicicletas de segunda mano para estudiantes internacionales.', 'Entrega e inspección gratuita, seguro básico incluido el primer mes.', '15% de descuento para miembros Robin', 'https://example.com/nlbike', 'Suscriptores activos', 1),
  ('Basic-Fit', 'gym', 'Nacional (NL)', 'Cadena de gimnasios con presencia en toda Holanda.', 'Acceso a todas las sedes, clases grupales incluidas.', '1 mes gratis al alta', 'https://example.com/basicfit', 'Suscriptores activos', 2),
  ('ONVZ Health Insurance', 'health_insurance', 'Nacional (NL)', 'Seguro médico obligatorio para estudiantes internacionales en NL.', 'Gestión de alta guiada por tu asesor Robin.', 'Tarifa preferente Robin', 'https://example.com/onvz', 'Todos los suscriptores', 3),
  ('ABN AMRO', 'bank', 'Nacional (NL)', 'Apertura de cuenta bancaria neerlandesa para estudiantes.', 'Cita prioritaria y acompañamiento en la apertura.', 'Sin comisión de apertura', 'https://example.com/abnamro', 'Todos los suscriptores', 4),
  ('Café Erasmus', 'local_business', 'Rotterdam', 'Cafetería y espacio de coworking cerca del campus.', 'Descuento en menú de estudiante y wifi rápido.', '10% de descuento', 'https://example.com/erasmus-cafe', 'Suscriptores activos', 5)
) as v(name, category, city, description, benefits, discount, contact_url, eligibility, sort_order)
where not exists (select 1 from public.partners);

insert into public.community_events (title, type, description, location, starts_at, capacity)
select * from (values
  ('Bienvenida Robin · Networking', 'networking', 'Encuentro mensual para nuevos suscriptores: conoce a otros estudiantes y al equipo Robin.', 'Rotterdam', now() + interval '10 days', 40),
  ('Fin de semana en Ámsterdam', 'trip', 'Escapada organizada de 2 días con alojamiento y actividades incluidas.', 'Ámsterdam', now() + interval '25 days', 20),
  ('Liga de pádel Robin', 'sports', 'Torneo amistoso quincenal abierto a todos los niveles.', 'Rotterdam', now() + interval '5 days', 16)
) as v(title, type, description, location, starts_at, capacity)
where not exists (select 1 from public.community_events);

commit;
