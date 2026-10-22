# Servicios backend compartidos

[← Subir un nivel](../README.md)

**Ruta real:** `lib/`

Reglas de dominio, autorización, validación y adaptadores usados por las Netlify Functions.

**Entra aquí:** Cuando la lógica sea reutilizable o no pertenezca al borde HTTP de un endpoint.

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`account-access-email.js`](../../../lib/account-access-email.js) | Servicio backend compartido para account access email. | `./email`<br>`./operational-config`<br>`./sandbox-mode` | Al cambiar lógica backend compartida o una integración. |
| [`admin-dashboard.js`](../../../lib/admin-dashboard.js) | Servicio backend compartido para admin dashboard. | `./admins`<br>`./authorization`<br>`./student-phone` | Al cambiar lógica backend compartida o una integración. |
| [`admins.js`](../../../lib/admins.js) | lib/admins.js — Fuente única de verdad de los asesores (admins) de Project Robin. Cada asesor tiene su propia cuenta Google Workspace (calendario + Meet). | — | Al cambiar lógica backend compartida o una integración. |
| [`anthropic-chat.js`](../../../lib/anthropic-chat.js) | lib/anthropic-chat.js Helper compartido para llamar a Claude para chat / resumen / historial. | — | Al cambiar lógica backend compartida o una integración. |
| [`auth.js`](../../../lib/auth.js) | Auth helpers para Netlify Functions. - bcrypt para hashing de password | — | Al cambiar lógica backend compartida o una integración. |
| [`authorization.js`](../../../lib/authorization.js) | Predicados de autorización compartidos por las Netlify Functions. No autentica peticiones ni sustituye `readSessionFromEvent`: clasifica una | `./admins`<br>`../shared/application-roles.cjs` | Al cambiar lógica backend compartida o una integración. |
| [`booking-availability.js`](../../../lib/booking-availability.js) | Servicio backend compartido para booking availability. | — | Al cambiar lógica backend compartida o una integración. |
| [`booking-config.js`](../../../lib/booking-config.js) | Servicio backend compartido para booking config. | — | Al cambiar lógica backend compartida o una integración. |
| [`booking-create.js`](../../../lib/booking-create.js) | Servicio backend compartido para booking create. | `./email`<br>`./anthropic-chat`<br>`./observability` | Al cambiar lógica backend compartida o una integración. |
| [`career-documents.js`](../../../lib/career-documents.js) | Servicio backend compartido para career documents. | — | Al cambiar lógica backend compartida o una integración. |
| [`career-requirements.js`](../../../lib/career-requirements.js) | Servicio backend compartido para career requirements. | `./career-documents` | Al cambiar lógica backend compartida o una integración. |
| [`career-suggestions.js`](../../../lib/career-suggestions.js) | Servicio backend compartido para career suggestions. | `./anthropic-chat`<br>`./careers-recommender` | Al cambiar lógica backend compartida o una integración. |
| [`careers-data.json`](../../../lib/careers-data.json) | Servicio backend compartido para careers data. | — | Al cambiar lógica backend compartida o una integración. |
| [`careers-recommender.js`](../../../lib/careers-recommender.js) | lib/careers-recommender.js Motor de recomendacion de carreras universitarias para Project Robin. | `./careers-data.json` | Al cambiar lógica backend compartida o una integración. |
| [`contract-pdf.js`](../../../lib/contract-pdf.js) | Genera el PDF del contrato firmado a partir de los bloques de shared/contract-content.cjs + los datos del cliente/alumno + la imagen de | `../shared/contract-content.cjs` | Al cambiar lógica backend compartida o una integración. |
| [`dni-upload.js`](../../../lib/dni-upload.js) | Servicio backend compartido para dni upload. | `./supabase`<br>`./storage` | Al cambiar lógica backend compartida o una integración. |
| [`document-drive.js`](../../../lib/document-drive.js) | Servicio backend compartido para document drive. | `./google-drive`<br>`./storage`<br>`./observability` | Al cambiar lógica backend compartida o una integración. |
| [`email.js`](../../../lib/email.js) | Envío de correos al cliente. Usa Resend (https://resend.com) si está configurada la env var RESEND_API_KEY. | `./supabase`<br>`./privacy` | Al cambiar lógica backend compartida o una integración. |
| [`faq-citations.js`](../../../lib/faq-citations.js) | Servicio backend compartido para faq citations. | `./faq-knowledge` | Al cambiar lógica backend compartida o una integración. |
| [`faq-knowledge.js`](../../../lib/faq-knowledge.js) | Base de conocimiento oficial de Robin sobre estudiar en Países Bajos. La fuente estructurada se comparte con el portal para evitar divergencias. | `../shared/portal-faqs.json` | Al cambiar lógica backend compartida o una integración. |
| [`google-calendar.js`](../../../lib/google-calendar.js) | lib/google-calendar.js Google Calendar + Meet helpers para reservas de asesores. | `./admins` | Al cambiar lógica backend compartida o una integración. |
| [`google-drive.js`](../../../lib/google-drive.js) | Google Drive helper — sube archivos al Drive de hello@project-robin.com. Autenticación: OAuth 2.0 con refresh token. Env vars obligatorias: | — | Al cambiar lógica backend compartida o una integración. |
| [`google-sheets.js`](../../../lib/google-sheets.js) | Google Sheets helper — refleja cada cliente asignado en la hoja de control de pagos/facturación (la misma que el equipo usa manualmente). | `../shared/financial-config.cjs`<br>`./payments` | Al cambiar lógica backend compartida o una integración. |
| [`holded.js`](../../../lib/holded.js) | Integración con Holded (facturación) — API v2 (Bearer PAT). Genera, por cada pago cobrado, una factura real en Holded y deja disponible | `../shared/financial-config.cjs`<br>`./observability` | Al cambiar lógica backend compartida o una integración. |
| [`http.js`](../../../lib/http.js) | Helpers comunes para Netlify Functions (handlers tradicionales con event/context). | `./observability` | Al cambiar lógica backend compartida o una integración. |
| [`identity.js`](../../../lib/identity.js) | Servicio backend compartido para identity. | — | Al cambiar lógica backend compartida o una integración. |
| [`integration-sync.js`](../../../lib/integration-sync.js) | Servicio backend compartido para integration sync. | `./observability`<br>`./sandbox-mode`<br>`./google-sheets`<br>`./payments`<br>`./holded` | Al cambiar lógica backend compartida o una integración. |
| [`meet-transcript.js`](../../../lib/meet-transcript.js) | Servicio backend compartido para meet transcript. | `./anthropic-chat`<br>`./admins`<br>`./observability`<br>`./privacy`<br>`./google-calendar`<br>`./google-drive` | Al cambiar lógica backend compartida o una integración. |
| [`notion.js`](../../../lib/notion.js) | Servicio backend compartido para notion. | `./supabase`<br>`./google-drive`<br>`./observability`<br>`./privacy`<br>`./sandbox-mode` | Al cambiar lógica backend compartida o una integración. |
| [`observability.js`](../../../lib/observability.js) | Servicio backend compartido para observability. | — | Al cambiar lógica backend compartida o una integración. |
| [`ocr.js`](../../../lib/ocr.js) | OCR de documento de identidad con Claude vision. Soporta DOS tipos de documento: | — | Al cambiar lógica backend compartida o una integración. |
| [`onboarding-fulfill.js`](../../../lib/onboarding-fulfill.js) | Lógica de "cumplimiento" tras pagar la primera cuota (onboarding): - marca users.pago_completed (idempotente) | `./supabase`<br>`./google-drive`<br>`./contract-pdf`<br>`../shared/financial-config.cjs`<br>`./storage`<br>`./sandbox-mode` | Al cambiar lógica backend compartida o una integración. |
| [`onboarding-welcome.js`](../../../lib/onboarding-welcome.js) | Correo de bienvenida tras completar el onboarding (portal de aplicación). Se envía UNA sola vez, en la transición pago_completed=false -> true | `./email`<br>`./operational-config`<br>`./sandbox-mode` | Al cambiar lógica backend compartida o una integración. |
| [`operational-config.js`](../../../lib/operational-config.js) | Servicio backend compartido para operational config. | — | Al cambiar lógica backend compartida o una integración. |
| [`payment-attempts.js`](../../../lib/payment-attempts.js) | Servicio backend compartido para payment attempts. | — | Al cambiar lógica backend compartida o una integración. |
| [`payment-fulfill.js`](../../../lib/payment-fulfill.js) | Servicio backend compartido para payment fulfill. | `./payments`<br>`./integration-sync`<br>`./onboarding-fulfill` | Al cambiar lógica backend compartida o una integración. |
| [`payment-provider.js`](../../../lib/payment-provider.js) | Servicio backend compartido para payment provider. | `./revolut` | Al cambiar lógica backend compartida o una integración. |
| [`payments.js`](../../../lib/payments.js) | Lógica común para calcular las cuotas según tipo y num_carreras. Devuelve [{ installment, amount }, ...] con nº variable de cuotas: | `../shared/financial-config.cjs` | Al cambiar lógica backend compartida o una integración. |
| [`privacy.js`](../../../lib/privacy.js) | Servicio backend compartido para privacy. | — | Al cambiar lógica backend compartida o una integración. |
| [`revolut.js`](../../../lib/revolut.js) | Revolut Merchant API adapter for the hosted checkout flow. | `./payment-fulfill` | Al cambiar lógica backend compartida o una integración. |
| [`sandbox-mode.js`](../../../lib/sandbox-mode.js) | Servicio backend compartido para sandbox mode. | — | Al cambiar lógica backend compartida o una integración. |
| [`storage.js`](../../../lib/storage.js) | Helpers de almacenamiento privado en Supabase Storage. Los binarios viven en Storage y la BD sólo guarda la ruta | — | Al cambiar lógica backend compartida o una integración. |
| [`student-phone.js`](../../../lib/student-phone.js) | Servicio backend compartido para student phone. | — | Al cambiar lógica backend compartida o una integración. |
| [`supabase.js`](../../../lib/supabase.js) | Cliente Supabase usado por las Netlify Functions (server-side). Usa la SERVICE ROLE KEY para bypassar RLS — esta key SOLO debe vivir | — | Al cambiar lógica backend compartida o una integración. |
| [`validation.js`](../../../lib/validation.js) | Servicio backend compartido para validation. | — | Al cambiar lógica backend compartida o una integración. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
