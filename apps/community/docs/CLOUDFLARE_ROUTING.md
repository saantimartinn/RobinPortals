# Cloudflare y enrutamiento — Robin Subscriptions

## Propiedad

La lógica del Worker de `project-robin.com` vive en [Robin Platform `project-robin-router.js`](https://github.com/RobinManuV/Robin-platform-cliente/blob/main/infrastructure/cloudflare/project-robin-router.js). Esta página describe el path mapping que espera este origin; no contiene el estado externo del zone/DNS/ruleset ni confirma una versión publicada de Worker.

El estado del dashboard Cloudflare revisado el 20-10-2026 (versión de producción, patrones de ruta, DNS y la discrepancia entre dos vistas de rutas) se registra en la [guía canónica](https://github.com/RobinManuV/Robin-platform-cliente/blob/main/docs/CLOUDFLARE_ROUTING.md).

## Entradas a este producto

| URL pública | Path pedido al origin Subscriptions | Uso |
|---|---|---|
| `/therobinplan` | `/therobinplan/` | Normaliza URL inicial conservando query. |
| `/therobinplan/*` | igual path | SPA, recursos estáticos y navegación del producto; Vite construye con `base: /therobinplan/`. |
| `/therobinplan/api/*` | `/api/*` | El Worker quita solo `/therobinplan`; el redirect Netlify escoge Function. |

Para `GET /therobinplan/api/me`, el navegador ve same origin y Netlify recibe `/api/me`. Para checkout `POST /therobinplan/api/subscription/checkout`, el body se preserva y el destino es el handler Stripe/plan en este repo. No pasar al dominio Netlify desde JS, porque cambiaría origin/cookies.

## API → Netlify Function

`netlify.toml` mapea:

- `/api/auth/*`, `/api/me`, signup y profile → Functions de auth/subscriber.
- `/api/subscription/*`, `/api/stripe/webhook`, descuento → checkout, portal, plans y Stripe webhook.
- `/api/social`, `/api/messages`, `/api/challenges`, `/api/partners`, `/api/community/*`, `/api/service-requests` → features de comunidad/servicios.
- `/api/sub-admin/*` y `/api/notifications*` → gestión y notificaciones.
- `/therobinplan/*` → `index.html` para navegación SPA; `/` redirige a `/therobinplan/`; `/portal/*` es ruta legacy que redirige.
- Build de Vite también genera `dist/_redirects` para `/api/sub-admin/db` → `sub-admin-database`, porque esa ruta DB de desarrollo/admin no depende del set de redirects normal en TOML.

`docs/API_INVENTORY.md` contiene la lista de ruta pública → handler. Cambiar el path requiere actualizar frontend API, `netlify.toml`, plugin redirect Vite cuando aplique y Worker mapping/consumidores.

## Headers y cookies

El Worker copia el request, ajusta `X-Forwarded-Host` y `Origin` al origin de Netlify y usa `redirect: manual`. Método y body se mantienen; el Worker no crea cookie de sesión ni modifica claims. Las cookies de Subscriptions las emite su backend con sus propios flags/secreto y el API es same-origin en el hostname público.

El origin Netlify aplica cabeceras globales de seguridad y `Cache-Control: no-store` a Functions. Assets bajo `/therobinplan/assets/*` tienen cache HTTP configurable; no confundir su caché con el versionado de assets Admin.

## SSO desde Robin Platform

1. El browser está en `/therobinplan/` con cookie de Platform válida.
2. El cliente API envía `/therobinplan/api/auth/sso`; Worker quita prefijo y manda `/api/auth/sso` al Function local.
3. `backend/functions/auth-sso.js` consulta el endpoint/credencial de Platform definido en environment y valida principal de origen.
4. El backend encuentra la cuenta de suscriptor autorizada, acuña cookie del producto y el frontend vuelve a llamar `/api/me`.

No se reenvía `JWT_SECRET`; no se acepta un rol no-suscriptor; el browser nunca debe poder invocar base de datos con service-role. Ver [IDENTITY_MODEL](IDENTITY_MODEL.md) y [AUTHORIZATION](AUTHORIZATION.md).

## Referencias

- [Guía global del Worker](https://github.com/RobinManuV/Robin-platform-cliente/blob/main/docs/CLOUDFLARE_ROUTING.md)
- [Robin Admin route note](https://github.com/RobinManuV/Robin-Admin/blob/main/docs/CLOUDFLARE_ROUTING.md)
- [Worker source](https://github.com/RobinManuV/Robin-platform-cliente/blob/main/infrastructure/cloudflare/project-robin-router.js), [local Netlify rules](../netlify.toml), [USERGUIDE](../USERGUIDE.md)
