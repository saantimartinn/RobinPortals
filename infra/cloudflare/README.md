# Cloudflare

Hoy `project-robin.com` reparte `/admin`, `/portal` y `/therobinplan` a varios sitios de Netlify con un Worker (`apps/portal/infrastructure/cloudflare/project-robin-router.js`).

Con el sitio unificado, ese reparto lo harán redirecciones proxy (`200!`) del sitio de la web hacia el sitio de apps, y el Worker dejará de ser necesario. Mientras tanto, `dev/proxy.mjs` reproduce ese reparto en local.
