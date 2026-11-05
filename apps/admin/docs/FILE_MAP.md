# Mapa técnico de Robin Admin

Mapa **mantenido manualmente**: explica responsabilidades, dependencias y recorridos de ejecución. El [índice de archivos generado](FILE_INDEX.generated.md) sirve como localizador complementario; véanse también [árbol completo](codebase/README.md) e [inventario API](API_INVENTORY.md).

## Límite del sistema

Robin Admin es una SPA React/Vite y un backend de Netlify Functions. El Worker Cloudflare que publica /admin y enruta servicios vive en Robin Platform. Cada cambio de arquitectura debe respetar esa frontera entre repos.

| Capa | Responsabilidad y ruta de lectura |
|---|---|
| Plantilla y build | [index.html](../index.html), [vite.config.mjs](../vite.config.mjs), [package.json](../package.json): plantilla con nonce CSP, entrada de Vite, chunks y salida dist. |
| Entrada navegador | [src/main.jsx](../src/main.jsx) monta la app; [src/App.jsx](../src/App.jsx) resuelve sesión, login y paso al shell autenticado. |
| Shell y composición | [admin-app.tsx](../src/components/admin-app.tsx) resuelve navegación, permisos de interfaz, carga y dispatch; [feature-modules.tsx](../src/components/feature-modules.tsx) mapea secciones a features. |
| UI compartida | [src/components/](../src/components/) contiene shell, dashboard, tablas y analítica; [components/ui/](../src/components/ui/) ofrece primitivas. |
| Features | [src/features/admin/](../src/features/admin/) agrupa CRM, leads, alumnos, email, ajustes y analytics. Cada pantalla llama a servicios de navegador. |
| Clientes de API | [src/services/](../src/services/) concentra contratos HTTP y adaptación de datos: [portal.ts](../src/services/portal.ts), [admin-data.ts](../src/services/admin-data.ts), [integrations.ts](../src/services/integrations.ts), web analytics. |
| Netlify Functions | [netlify/functions/](../netlify/functions/) contiene handlers HTTP y jobs; [netlify.toml](../netlify.toml) enlaza rutas públicas y handlers. |
| Edge y servicios | netlify/edge-functions aplica límites antes de Functions; [lib/](../lib/) contiene autorización, dominio y proveedores. |
| Datos | supabase/migrations, supabase/admin-migrations y supabase/robin-plan-migrations contienen cambios SQL por ámbito de base. No asumir que apuntan al mismo proyecto. |

## Recorridos por dominio

| Dominio | Pantalla / cliente | Entradas HTTP | Servicios y dependencias |
|---|---|---|---|
| Sesión / usuarios | App.jsx, portal.ts, admin-app.tsx | auth-login, auth-logout, auth-change-password, me, admin-users, admin-dashboard | [auth.js](../lib/auth.js), [admin-auth.js](../lib/admin-auth.js), [authorization.js](../lib/authorization.js), admins.js, admin-profiles.js |
| CRM / leads | lead-inbox, leads, email-composer, admin-data.ts | admin-crm-leads, admin-crm-lead-notes, admin-crm-lead-calls, admin-crm-future-leads, admin-crm-email, crm-convert, notion-webhook, meta-lead-webhook, website-lead | crm-identity.js, crm-lead-ingest.js, crm-performance.js, crm-historical-metrics.js; [guía de flujo](userguide/06-cross-repository-flows.md) |
| Alumnos / clientes / documentos | students y features del shell | admin-clients-*, admin-documents-*, documents-*, admin-drive-* | admin-dashboard.js, document-drive.js, storage.js, google-drive.js |
| Finanzas / pagos / ventas | analytics-finance, analytics-sales, integrations.ts | admin-finance-dashboard, admin-sales-dashboard, admin-holded-snapshot, admin-payments-*, payments-*, stripe-webhook, invoice-pdf | [lib/finance/](../lib/finance/), [lib/holded/](../lib/holded/), payments.js, stripe.js, sales-dashboard.js |
| Alta / perfil / carrera | módulos del portal y portal.ts | onboarding-*, profile-*, careers-list, admin-careers-* | onboarding-fulfill.js, career-requirements.js, career-documents.js, career-suggestions.js |
| Reservas / chat / FAQ / notificaciones | módulos del shell y portal.ts | bookings-*, chat-ai, admin-chat, faqs, notifications-*, meet-* | booking-create.js, booking-availability.js, faq-knowledge.js, meet-transcript.js, email.js |
| Analítica externa | analytics y web-analytics.ts | web-collect, web-retention, admin-web-*, admin-meta-insights, admin-integration-snapshot, integration-retry | web-analytics-auth.js, google-web-analytics.js, observability.js y adaptadores de proveedor |

Los endpoints completos, rutas y verbos están en [API_INVENTORY.md](API_INVENTORY.md); la autorización exacta debe confirmarse en cada handler y servicio.

## Responsabilidades del backend

- [lib/http.js](../lib/http.js), [lib/validation.js](../lib/validation.js), privacy.js y observability.js son infraestructura transversal de protocolo, validación y auditoría.
- auth.js y admin-auth.js validan identidad; authorization.js/admins.js resuelven permisos. La lista de pestañas del cliente no es un control de seguridad.
- supabase.js y admin-supabase.js son accesos de servidor. subscriptions-supabase.js delimita el almacenamiento del producto Robin Subscriptions, que posee sus propias migraciones.
- finance-dashboard.js y holded.js son fachadas; el cálculo se descompone en lib/finance y lib/holded.
- Adaptadores externos encapsulados: Google Calendar/Drive/Gmail/Sheets/Analytics, Holded, Notion, Stripe, Anthropic, email y Storage. Los secretos viven solo en runtime servidor.

## Contratos entre apps del monorepo

| Desde | Hacia | Contrato |
|---|---|---|
| Admin navegador | Worker de raíz | Entrada pública `/admin`; el Worker entrega el path sin reescritura al sitio unificado. |
| Admin navegador | Robin Platform API | /portal/api/* gestiona identidad común; las rutas /api/admin/* siguen en este repo. |
| Platform / webhooks CRM | Admin Functions | /api/internal/crm/* y webhooks llegan a handlers propios; estos deben comprobar secreto/firma y validar payload. |
| Portal del Alumno | Robin Community | Navegación y SSO por HTTP; Community mantiene sesión y dominio de datos propios. |

Guías vecinas: [Portal del Alumno](../../portal/USERGUIDE.md) · [Robin Community](../../community/USERGUIDE.md).

## Publicación y exploración

[netlify.toml](../netlify.toml) aporta las rutas y Functions de Admin al
`netlify.toml` generado en la raíz. Vite produce el bundle que incorpora
`site/build.mjs`; el backend no forma parte de los assets estáticos. El Worker
vigente está en [`infra/cloudflare`](../../../infra/cloudflare/) y el estado
efectivo de DNS/rutas requiere confirmación del dashboard:
[CLOUDFLARE_ROUTING.md](CLOUDFLARE_ROUTING.md).

- [USERGUIDE](../USERGUIDE.md): índice de los recorridos detallados.
- [Arquitectura](ARCHITECTURE.md): estructura por carpeta y dependencias.
- [Guías de dominio](userguide/01-runtime-and-session.md): módulos y secuencias.
- [Árbol de todos los archivos](codebase/README.md): localizador recursivo generado.

