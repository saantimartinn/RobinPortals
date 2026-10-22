# Base de datos actual

Fuente: migraciones versionadas `supabase/migrations/001` a `004`. Describe el esquema del código; no es una introspección de una base desplegada.

| Área | Tablas |
|---|---|
| Identidad y suscripción | subscribers |
| Catálogo y contenido | partners, discount_codes, subscription_faqs |
| Eventos | community_events, event_rsvps |
| Servicios | service_requests |
| Avisos | notifications, notification_recipients |
| Social | friendships, direct_messages |
| Retos | challenges, challenge_submissions |
| Facturación | subscription_invoices |
| Operación | webhook_log |

Las claves foráneas de usuario apuntan a `subscribers`. El esquema también incluye `subscription_faqs` (migración 002) y `subscription_invoices` (migración 004). RLS está activado; los clientes
no deben conectarse directamente con claves anónimas para operar estas tablas.

Ejecutar el esquema en un proyecto nuevo. `CREATE TABLE IF NOT EXISTS` no adapta
automáticamente tablas existentes con columnas diferentes. Para bases ya usadas,
comparar estructura y preparar migraciones incrementales antes de aplicar cambios.
No se incluyen contraseñas, administradores ni datos demo en la migración estructural.
