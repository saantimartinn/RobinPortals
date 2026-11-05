# Cloudflare y enrutamiento — Robin Jr

La fuente versionada vigente es [`infra/cloudflare/project-robin-router.js`](../../../infra/cloudflare/project-robin-router.js). El Worker envía las rutas de las cuatro apps al sitio Netlify unificado (`robinportals.netlify.app`) **sin reescribir el path**. Cualquier otra ruta permanece en la web pública. Esta página describe el código del repositorio; comprueba el despliegue activo de Cloudflare antes de atribuirle una versión concreta.

| Ruta pública | Destino previsto |
|---|---|
| `/portal/*`, `/login` | Portal del Alumno en el sitio unificado |
| `/robinjr/*` | Robin Jr en el sitio unificado |
| `/therobinplan/*` | Robin Community en el sitio unificado |
| `/admin/*`, `/api/admin/*`, `/api/internal/*` | Robin Admin en el sitio unificado |
| Otras rutas | Web pública separada |

Hay una excepción temporal para **webhooks firmados** recibidos en `/portal/api/notion/webhook`, `/portal/api/meet/webhook`, `/portal/api/revolut/webhook` y `/therobinplan/api/stripe/webhook`: el Worker los mantiene en sus receptores anteriores mientras conviven ambos sitios. Las peticiones enviadas directamente a una URL `.netlify.app` no pasan por este Worker.

El [`netlify.toml` de raíz](../../../netlify.toml) se genera a partir de los `apps/*/netlify.toml` con `npm run site:config`. [`site/build.mjs`](../../../site/build.mjs) empaqueta las cuatro apps en un solo despliegue. Para desarrollar en local, ejecuta `npm run dev` desde la raíz. Consulta la [guía del Worker](../../../infra/cloudflare/README.md) y los [tests de rutas](../../../site/test/router.test.mjs).

El Worker anterior que repartía apps entre varios sitios está conservado en el historial Git y en `apps/portal/infrastructure/cloudflare/`; no es la fuente vigente de enrutamiento.
