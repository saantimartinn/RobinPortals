# Robin Subscriptions — guía técnica extendida

> **¿Primera vez en el código?** Empieza por la [USERGUIDE](USERGUIDE.md), que enlaza el recorrido por la sesión propia, el SSO de aplicación, el frontend, la API, billing, datos y routing.
>
> Para seguir una operación entre UI, API, backend y proveedores, consulta [DATAFLOW](docs/DATAFLOW.md); para datos personales, [PRIVACY_DATA_MAP](docs/PRIVACY_DATA_MAP.md).

## Rol y límites

Esta app del monorepo implementa The Robin Plan con frontend React/Vite,
Functions y un proyecto Supabase propio. Comparte el sitio Netlify con las
otras apps y se sirve bajo `/therobinplan/` en `project-robin.com`. El Portal
del Alumno provee la identidad de origen para SSO; Admin es otra app del sitio.

El modelo de cuentas, sesiones, DB, secretos JWT y checkout de suscriptor es independiente. No usar la tabla `users` ni el `JWT_SECRET` de Robin Platform como fallback.

## Topología

```mermaid
flowchart LR
  Browser --> CF[Cloudflare Worker]
  CF -->|rutas de las cuatro apps| Netlify[Netlify unificado]
  Netlify --> SPA[frontend React/Vite]
  Browser -->|/therobinplan/api/* + cookie| Netlify
  Netlify --> Functions[backend/functions]
  Functions --> Lib[backend/lib]
  Lib --> DB[(Supabase Robin Plan)]
  Lib --> Stripe[Stripe Billing]
  Lib --> Providers[Anthropic · Resend · Holded]
  Platform[Robin Platform session] -->|SSO validation| Functions
```

El router vigente se encuentra en
[`infra/cloudflare/project-robin-router.js`](../../infra/cloudflare/project-robin-router.js).
Detalles de rutas en [CLOUDFLARE_ROUTING.md](docs/CLOUDFLARE_ROUTING.md).

## Estructura

### Frontend

`frontend/src/main.jsx` monta `frontend/src/app.jsx`. El componente raíz comprueba `/api/me`; si el backend devuelve 401 durante una entrada desde aplicación, intenta `/api/auth/sso`, vuelve a cargar sesión propia y después clasifica al usuario:

- sin sesión → redirige al login común (`/login`, portal del alumno);
- rol `subscriber_admin` → `SubscriberAdmin`, solo si la identidad de aplicación concede la clave `platform.robin_plan`;
- rol `subscriber` → `SubscriberPortal`;
- cualquier rol ajeno → mensaje de incompatibilidad y logout.

`frontend/src/api/index.js` es la interfaz frontend del backend. `application/SubscriberPortal.jsx` es el shell de suscriptor; `application/SubscriberShell.jsx` y `SubscriptionPlanPicker.jsx` soportan layouts/checkout; `CrossPortalNav.jsx` salta entre productos.

`frontend/src/features/` separa autenticación, admin, pagos/suscripción, perfil, careers, services, levels/progreso y community (eventos, mensajes, retos, grupos, partners y social). `frontend/src/shared/` concentra UI, tema, identidad, cookies/client-safe helpers y términos. `frontend/public/` contiene recursos y logos de partner con URL pública.

### Backend y base de datos

- `backend/functions/`: adaptadores HTTP de Netlify; `netlify.toml` enlaza `/api/*` a handlers.
- `backend/lib/`: sesión/principal, Supabase, subscription/billing, Stripe, discounts, HTTP, social, email, Anthropic y logo handling.
- `supabase/migrations/`: esquema privado del producto; `supabase/seeds/` solo contiene filas opcionales de demo.
- `test/`: pruebas Node.js sin credenciales de producción.
- `scripts/`: `check-architecture.cjs`, `generate-docs.cjs`, creación explícita de admin y mantenimiento.

No hay servidor Express; Netlify Functions son toda la superficie backend.

## Identidad y SSO

1. El browser visita `/therobinplan/` y API client usa `/therobinplan/api/*` al detectar el host de producto.
2. La Function de Subscriptions valida su cookie JWT propia.
3. Cuando `/api/me` falla con 401 en el flujo de sesión común, `app.jsx` llama `exchangeApplicationSession()` (`/api/auth/sso`).
4. `backend/functions/auth-sso.js` consulta la sesión de Robin Platform mediante `PORTAL_SUPABASE_*`/API validada; la identidad se enlaza a una cuenta `subscriber` existente según criterios del backend.
5. Solo entonces crea el principal de Subscriptions y su cookie con `JWT_SECRET` propio.

El principal se canonicaliza en `backend/lib/principal.js`; solo `subscriber` y `subscriber_admin` pertenecen al dominio. La autorización de tablas por rol está en `backend/lib/application-permissions.js` y admin handlers; el front no puede concederse acceso a sí mismo.

## Suscripción, comunidad y operaciones

- **Billing**: `subscription-checkout`, `subscription-plans`, `subscription-portal`, `discount-validate` y `stripe-webhook`; lógica en `subscription-billing.js`, `stripe.js`, `discounts.js`. Stripe webhook valida firma; estado local se actualiza de forma reconciliable.
- **Contenido**: FAQs, perfiles, CV assistido por IA y services en handlers específicos; uso de Anthropic y Resend en servicios backend.
- **Community**: social, messages, challenges, events y RSVP poseen API y pantallas; los roles y el ownership se comprueban en cada mutation.
- **Gestión**: `/api/sub-admin/data`, `/mutate`, `/partner-logo`, `/db` es solo para operator con scope fuerte; SQL console usa allowlist de destino y no debe ampliarse sin auditoría.
- **Notificaciones**: endpoints list/ack y popup UI mantienen estado de lectura y acción del usuario.

El catálogo de contratos está en [API_INVENTORY](docs/API_INVENTORY.md), funciones UI en [USERGUIDE](USERGUIDE.md), reglas de permisos en [AUTHORIZATION](docs/AUTHORIZATION.md) y DB en [DATABASE_CURRENT](docs/DATABASE_CURRENT.md).

## Build y publicación

- Entrada pública: [The Robin Plan](https://project-robin.com/therobinplan/).
- Node.js `>=22.13.0`; `.nvmrc` define la versión de referencia.
- El build de raíz `site/build.mjs` incorpora el frontend y empaqueta las Functions en el sitio unificado.
- `npm test` desde la raíz comprueba el sitio y las cuatro aplicaciones. `npm run docs:generate` desde esta app actualiza sus mapas.
- Netlify publica la salida unificada; las rutas y cabeceras provienen de los `netlify.toml` de cada app.

## Repos relacionados

- [Robin Platform cliente](../portal/README.md): identity provider / aplicación de origen; [READMELONG](../portal/READMELONG.md), [USERGUIDE](../portal/USERGUIDE.md), [Cloudflare paths](../portal/docs/CLOUDFLARE_ROUTING.md).
- [Robin Admin](../admin/README.md): panel interno; [READMELONG](../admin/READMELONG.md), [USERGUIDE](../admin/USERGUIDE.md), [API mapping](../admin/docs/API_INVENTORY.md).

Las cuatro aplicaciones se publican juntas. Los cambios de SSO, roles, rutas, scopes, producto/checkout o navegación requieren comprobar sus consumidores antes del despliegue unificado.

## Repositorio público y licencia

Este monorepo no se distribuye bajo una licencia de código abierto. Consulta la [guía de publicación](../../docs/PUBLIC_REPOSITORY.md) y el aviso de [`LICENSE`](../../LICENSE); los permisos de fotografías, marcas y otros recursos pueden ser distintos.
