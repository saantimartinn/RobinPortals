# Datos usados por la plataforma

Este documento conserva únicamente el modelo consumido por los portales de alumnos y
administración. Se deriva del snapshot estructural aportado el 19 de agosto de 2026; no es
una consulta actual ni una migración. Esta limpieza no ejecutó cambios sobre la base de datos.

## Seguridad y acceso

El navegador no accede directamente al proveedor de datos. Las Netlify Functions usan un
cliente de servidor y aplican sesión, rol y ownership en código. Los buckets `dni-uploads` y
`documents` son privados; las descargas pasan por backend o URLs firmadas.

## Tablas activas

| Tabla | Propósito | Relación principal | Consumidores |
|---|---|---|---|
| `admin_tasks` | Tareas privadas por administrador | `user_id → users.id` | `admin-tasks`, `admin-dashboard` |
| `ai_chat_messages` | Conversaciones de alumno, IA y advisor | `user_id → users.id` | `chat-ai`, `admin-chat`, `chat-cleanup` |
| `ai_chat_state` | Pausa/reanudación de IA por alumno | `user_id → users.id` | `chat-ai`, `admin-chat`, `chat-cleanup` |
| `bookings` | Reservas Calendar/Meet | `user_id → users.id` | bookings, dashboard y transcripciones |
| `birthday_events` | Deduplicación anual de felicitaciones y aviso al asesor | `user_id → users.id` | tarea programada de cumpleaños |
| `career_templates` | Catálogo de carreras y requisitos | — | careers, documentos, asistentes y reservas |
| `client_careers` | Asignación alumno–carrera | `user_id → users.id` | careers, asistentes y reservas |
| `documents` | Requisitos y ficheros del alumno | `user_id → users.id` | endpoints de documentos, dashboard y asistentes |
| `notification_recipients` | Estado por destinatario | `notification_id → notifications.id` | notificaciones de alumnos/admins |
| `notifications` | Cabeceras de avisos | — | notificaciones de alumnos/admins |
| `payments` | Cuotas, cobros y metadata fiscal | `user_id → users.id` | pagos, Revolut, Holded, Sheets y dashboard |
| `payment_attempts` | Correlación server-only de checkouts alojados | `user_id → users.id`, `payment_id → payments.id` | retorno y webhook de Revolut |
| `processed_meet_docs` | Idempotencia de transcripciones | `user_id → users.id` | polling de Meet |
| `users` | Identidad, onboarding y expediente | — | autenticación y todos los dominios de aplicación |
| `webhook_log` | Registro técnico y reintentos | — | email, Holded, onboarding, Meet, Notion y Revolut |

## Reglas relevantes

- `users`: `lead_id` y `username` únicos; `application_phase` entre 1 y 9. El perfil académico se conserva en `academic_system` y `academic_subjects` (JSONB con nombre y nivel opcional por asignatura).
- `birthday_events`: combinación `(user_id, birthday_year)` única; acceso exclusivo del backend mediante RLS sin políticas públicas.
- `client_careers`: combinación `(user_id, career_template_id)` única.
- `payments`: `installment >= 1` y combinación `(user_id, installment)` única.
- `notification_recipients`: combinación `(notification_id, user_id)` única.
- `ai_chat_messages.role`: `user`, `assistant` o `advisor`.
- Los binarios de `documents` se almacenan en Storage; la tabla conserva rutas y metadata.
- Las reservas de aplicación utilizan Google Calendar y Meet.

## Storage

| Bucket | Público | Uso |
|---|---:|---|
| `dni-uploads` | No | Documentos de identidad del onboarding |
| `documents` | No | Documentos y plantillas del expediente |

## Riesgos operativos

1. La autorización efectiva depende de cada Function y de no exponer credenciales servidor.
2. El snapshot debe regenerarse de forma autorizada tras cualquier cambio de schema.
