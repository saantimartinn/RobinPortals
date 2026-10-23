# Cloudflare

`project-robin.com` pasa por un Worker de Cloudflare.

- **Hoy en producción:** `apps/portal/infrastructure/cloudflare/project-robin-router.js` reparte `/admin`, `/portal` y `/therobinplan` entre tres sitios de Netlify y reescribe sus rutas.
- **Con el sitio unificado:** `project-robin-router.js` (esta carpeta) manda `/portal`, `/robinjr`, `/therobinplan`, `/admin`, `/login`, `/api/admin/*` y `/api/internal/*` al sitio de apps **sin cambiar la ruta**; todo lo demás es la web, que es un proyecto aparte. Los webhooks firmados que llegan por `/portal/api/{notion,meet,revolut}/webhook` y `/therobinplan/api/stripe/webhook` siguen en los receptores antiguos mientras ambos sitios funcionan; los webhooks que los proveedores envían directamente a las URL `.netlify.app` no pasan por este Worker. Antes de publicarlo, `APPS_ORIGIN` tiene que ser la URL `.netlify.app` del sitio de apps. Sus rutas se prueban en `site/test/router.test.mjs`.
- **Marcha atrás:** volver a publicar el Worker anterior.
