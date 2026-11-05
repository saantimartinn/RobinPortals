# Mapa técnico de Robin Platform cliente

Mapa **revisado manualmente** de la plataforma, sus contratos y su router Cloudflare. El [índice de archivos generado](FILE_INDEX.generated.md) es solo un localizador. Complementan esta lectura el [árbol](codebase/README.md), [mapa de componentes](COMPONENT_MAP.md), [inventario API](API_INVENTORY.md) y [guía Cloudflare](CLOUDFLARE_ROUTING.md).

## Fronteras y despliegue

La app contiene el Portal del Alumno y sus endpoints Netlify. El Worker vigente
está en `infra/cloudflare/` de la raíz y enruta las cuatro apps del monorepo.
`site/build.mjs` arma el directorio publicado; Functions y librerías backend no
se exponen como assets estáticos.

| Componente | Entrada y responsabilidad |
|---|---|
| Router Cloudflare | [project-robin-router.js](../../../infra/cloudflare/project-robin-router.js) entrega los prefijos de las apps al sitio unificado sin cambiar el path. |
| Build Netlify | [netlify.toml](../netlify.toml) configura build, publicación, redirects API, cabeceras, schedules y edge middleware. |
| Build SPA | [portal-source/vite.config.js](../portal-source/vite.config.js) prepara la salida que Netlify publica bajo portal. |
| Bootstrap navegador | portal-source/index.html → [main.jsx](../portal-source/src/main.jsx) → [app.jsx](../portal-source/src/app.jsx). El root resuelve sesión y selecciona el portal de alumno o admin. |

## Navegador: de pantalla a API

| Módulo | Propósito y conexiones |
|---|---|
| [src/api.js](../portal-source/src/api.js) | Fachada de compatibilidad que conserva imports anteriores y delega en módulos por dominio. |
| [src/api/core.js](../portal-source/src/api/core.js) | Transporte same-origin, cookies, serialización JSON y errores; otros módulos API encapsulan auth, onboarding, perfil, pagos, documentos, uploads, carreras, reservas, chat, FAQs, notificaciones y operaciones admin. |
| [src/application/ApplicationPortals.jsx](../portal-source/src/application/ApplicationPortals.jsx) | Decide qué shell presentar según usuario y estado de aplicación. |
| application de alumno | StudentProfile, StudentStatus, ClientSections, BookingsPortal, Faqs y PortalAssistant componen estado, datos, reservas y ayuda. |
| [src/application/AdminPortal.jsx](../portal-source/src/application/AdminPortal.jsx) | Composición admin; AdminWorkspace y admin-navigation resuelven secciones. admin-permissions.js es presentación; el backend vuelve a autorizar. |
| [src/application/onboarding/](../portal-source/src/application/onboarding/) | OnboardingFlow coordina pasos de perfil, origen, DNI, contrato y pago; los formularios reutilizan onboarding-shared y questionnaire-fields. |
| [src/application/admin/](../portal-source/src/application/admin/) | Subvistas administrativas de clientes, pagos, documentos, carreras, reservas, dashboard, progreso, notificaciones y perfil. |
| [ConvertMentoria.jsx](../portal-source/src/application/admin/ConvertMentoria.jsx) | Conversión de una Mentoría abonada a General, Delft o Llegada desde la ficha/lista; el backend comprueba el pago. |
| [src/application/careers/](../portal-source/src/application/careers/) | Requisitos y timeline de carrera; toma sus datos de APIs de carrera. |
| [src/application/payments/](../portal-source/src/application/payments/) | Recibos y presentación de pagos; el backend y proveedor son fuente de verdad. |
| [src/application/documents/](../portal-source/src/application/documents/) | Helpers de clasificación/formato documental. |
| [src/application/CrossPortalNav.jsx](../portal-source/src/application/CrossPortalNav.jsx) | Puente de navegación hacia The Robin Plan, bajo /therobinplan/. |
| shared, assets, public | Widgets, tema, UI común y recursos importados o servidos sin procesamiento. |

## Servidor y datos

Las rutas están configuradas en netlify.toml y se enumeran en [API_INVENTORY.md](API_INVENTORY.md). Handlers en [netlify/functions/](../netlify/functions/) son límites HTTP: método, origen, sesión, autorización, validación y formato de respuesta. La lógica reutilizable está bajo [lib/](../lib/).

| Dominio | Handlers | Núcleo del dominio |
|---|---|---|
| Identidad | auth-login, auth-logout, auth-change-password, me | auth.js, authorization.js, identity.js, admins.js |
| Onboarding | onboarding-state/profile/origin/DNI/contract/checkout | validation.js, dni-upload.js, contract-pdf.js, onboarding-fulfill.js, onboarding-welcome.js |
| Pagos | payments-checkout/verify/list y stripe-webhook | payment-attempts.js, payment-provider.js, payment-fulfill.js, revolut.js, payments.js |
| Usuarios y administración | admin-dashboard, admin-clients-*, admin-payments-*, admin-documents-*, crm-convert | admin-dashboard.js, admin-supabase.js, admins.js y permisos |
| Conversión de Mentoría | admin-client-convert-mentoria | `convert_paid_mentoria_client` en Supabase y `shared/financial-config.cjs`; [flujo completo](MENTORIA_CONVERSION.md) |
| Documentos/carrera | documents-*, careers-list, admin-careers-* | storage.js, document-drive.js, career-documents.js, career-requirements.js, career-suggestions.js |
| Operación | bookings-*, chat-ai, faqs, notifications-*, meet-*, integration-retry | booking-*.js, anthropic-chat.js, faq-*.js, email.js, Google adapters, observability.js |

lib/http.js, validation.js y observability.js dan soporte transversal. supabase.js accede a la base de Platform y admin-supabase.js separa operaciones administrativas. shared contiene contratos que pueden importar varios lados; al cambiarlos hay que comprobar cliente, handlers y consumidores. supabase/migrations versiona esquema de este producto; secretos solo se usan en runtime de servidor.

## Contratos entre apps del monorepo

| Flujo | Límite |
|---|---|
| /admin | El Worker vigente de la raíz conserva el path y entrega Admin al sitio unificado. |
| /portal | Mismo frontend y API del portal. Las llamadas API son same-origin; Netlify Edge puede limitar antes de ejecutar Functions. |
| /therobinplan | El Worker entrega Robin Community al mismo sitio; la app conserva su dominio de datos y sesión. |
| /portal/api/* | Acceso a endpoints de Platform usado por el portal Admin para identidad compartida. |
| /api/internal/crm/* | Contrato de integración con handlers de Robin Admin; autenticación por secreto/firma según handler. |

Guías cruzadas: [rutas y apps](CLOUDFLARE_ROUTING.md), [mapa Admin](../../admin/docs/FILE_MAP.md) y [mapa Community](../../community/docs/FILE_MAP.md).

## Mantenimiento

La lógica Cloudflare vigente vive en [`infra/cloudflare`](../../../infra/cloudflare/). El dashboard confirma bindings, versión activa, dominios y DNS; no inventar esos datos a partir del código. [ARCHITECTURE](ARCHITECTURE.md) describe carpetas y runtime; [USERGUIDE](../USERGUIDE.md) lleva desde funciones visibles hasta handlers y persistencia. El [índice generado](FILE_INDEX.generated.md) y el árbol completo localizan archivos, pero el presente mapa explica cómo colaboran.
