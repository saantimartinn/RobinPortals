# Cloudflare

`project-robin.com` pasa por un Worker de Cloudflare.

- **Ruta actual:** `project-robin-router.js` (esta carpeta) manda `/portal`, `/robinjr`, `/therobinplan`, `/admin`, `/login`, `/api/admin/*` y `/api/internal/*` al sitio de apps **sin cambiar la ruta**; todo lo demás es la web, que es un proyecto aparte. Los webhooks firmados que llegan por `/portal/api/{notion,meet,revolut}/webhook` y `/therobinplan/api/stripe/webhook` siguen en los receptores antiguos mientras ambos sitios funcionan; los webhooks que los proveedores envían directamente a las URL `.netlify.app` no pasan por este Worker. `APPS_ORIGIN` apunta al sitio unificado. Sus rutas se prueban en `site/test/router.test.mjs`.
- **Ruta anterior:** `apps/portal/infrastructure/cloudflare/project-robin-router.js` repartía `/admin`, `/portal` y `/therobinplan` entre tres sitios de Netlify y reescribía sus rutas.
- **Marcha atrás:** volver a publicar el Worker anterior.
