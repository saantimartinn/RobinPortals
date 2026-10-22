# Mapa técnico de Robin Subscriptions

Mapa **revisado manualmente** de The Robin Plan. El [índice generado](FILE_INDEX.generated.md) y el [árbol recursivo](codebase/README.md) son localizadores auxiliares; este documento describe dependencias y recorridos. Ver también [API_INVENTORY](API_INVENTORY.md), [COMPONENT_MAP](COMPONENT_MAP.md) y [enrutamiento](CLOUDFLARE_ROUTING.md).

## Límites

Este repo despliega un SPA React/Vite en Netlify junto con sus Functions Node. La app pública conserva el prefijo /therobinplan/; la API usa rutas locales /api/* que el Worker publica bajo /therobinplan/api/*. No es una extensión del backend de alumnos: usa principal, sesión, esquema y credenciales propios.

| Entrada | Papel |
|---|---|
| [netlify.toml](../netlify.toml) | Build/publish, endpoints Functions, headers y fallback. |
| [frontend/vite.config.js](../frontend/vite.config.js) | Vite base /therobinplan/, build a ../dist/therobinplan y redirect para /api/sub-admin/db. |
| frontend/index.html → [main.jsx](../frontend/src/main.jsx) → [app.jsx](../frontend/src/app.jsx) | Montaje, bootstrap de sesión, rol local y shell de la app. |
| [frontend/src/api/](../frontend/src/api/) | Clientes fetch same-origin y wrappers por contrato; cookies HttpOnly se administran en servidor. |
| [frontend/src/application/](../frontend/src/application/) | Composición del shell subscriber/admin, selector y navegación. |

## Frontend por feature

| Carpeta | Pantallas y recorrido |
|---|---|
| [features/subscription/](../frontend/src/features/subscription/) | Inicio, plan, pagos, FAQs y soporte; consume endpoints /api/subscription, /api/faqs y /api/me. |
| [features/profile/](../frontend/src/features/profile/) | Perfil y configuración, en coordinación con endpoints de subscriber profile. |
| [features/career/](../frontend/src/features/career/) | CV, empleos, mentorías y herramientas de documento. CV con IA pasa por backend. |
| [features/services/](../frontend/src/features/services/) | Servicios personales y solicitudes. |
| [features/community/](../frontend/src/features/community/) | Social, grupos, mensajes, eventos, retos, partners, ofertas y viajes. |
| [features/levels/](../frontend/src/features/levels/) | Progreso y beneficios de la suscripción. |
| [features/admin/](../frontend/src/features/admin/) | Usuarios, partners, eventos, FAQs, descuentos, notificaciones, retos y consola de datos. |
| [frontend/src/shared/](../frontend/src/shared/) | Theme, componentes de UI, popups, términos y utilidades. |
| frontend/src/assets y frontend/public | Imágenes bundladas frente a recursos servidos sin import. |

## API y servicios de servidor

Los handlers de [backend/functions/](../backend/functions/) conectan rutas con dominio. [API_INVENTORY.md](API_INVENTORY.md) enumera contratos HTTP; las funciones además pueden comprobar permisos/propiedad que no se reflejan por completo en un inventario estático.

| Dominio | Entradas principales | Servicios |
|---|---|---|
| Sesión y SSO | auth-login, auth-sso, auth-logout, auth-change-password, me | [auth.js](../backend/lib/auth.js), [principal.js](../backend/lib/principal.js), [http.js](../backend/lib/http.js), supabase.js |
| Registro | subscriber-signup, auth-change-password | password-reset.js, email.js, auth.js |
| Billing | subscription-plans, subscription-checkout, subscription-portal, discount-validate, stripe-webhook | [subscription.js](../backend/lib/subscription.js), [subscription-billing.js](../backend/lib/subscription-billing.js), stripe.js, discounts.js |
| Comunidad | social, messages, challenges, community-events-list, community-rsvp, partners-list | [social.js](../backend/lib/social.js), permisos, supabase.js |
| Perfil y servicios | subscriber-profile-update, subscriber-cv-ai, service-requests | application-permissions.js, anthropic-chat.js, email.js |
| Admin de producto | faqs, notifications-*, sub-admin-data, sub-admin-mutate, sub-admin-database, partner-logo-upload | application-permissions.js, partner-logo.js, supabase.js |

http.js centraliza convenciones HTTP, auth.js emite/verifica cookies/JWT locales, principal.js interpreta sujeto/rol y application-permissions.js aplica permisos. supabase.js conecta únicamente a la base de Subscriptions. subscription-billing.js y stripe.js encapsulan el flujo de pago; el webhook firmado confirma eventos del proveedor.

## Esquema, SSO y repos relacionados

[supabase/migrations/](../supabase/migrations/) versiona el esquema propio del producto; seeds son datos demo optativos. No aplicar migraciones a la base del portal cliente.

Al llegar desde Robin Platform, auth-sso valida la sesión de origen consultando Platform y busca una cuenta local coincidente por identificador admitido. Solo entonces crea la sesión/cookie de Subscriptions. Los roles admitidos son subscriber y subscriber_admin; la autorización local sigue siendo obligatoria tras SSO. El logout debe eliminar las cookies que correspondan al contrato desplegado sin compartir secretos JWT.

| Aplicación | Propiedad |
|---|---|
| [Robin Platform cliente](https://github.com/RobinManuV/Robin-platform-cliente) | Portal principal, identidad de origen y Worker Cloudflare. |
| [Robin Admin](https://github.com/RobinManuV/Robin-Admin) | Administración de operación/CRM; backend distinto. |
| Robin Subscriptions | The Robin Plan, billing, DB y sesión del producto. |

Los contratos coordinados están descritos en [USERGUIDE](../USERGUIDE.md) y [flujo entre repos](userguide/06-cloudflare-cross-repo.md). La guía [CLOUDFLARE_ROUTING](CLOUDFLARE_ROUTING.md) documenta el prefijo, mientras [ARCHITECTURE](ARCHITECTURE.md) explica publicación y carpetas.
