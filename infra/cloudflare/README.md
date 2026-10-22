# Cloudflare

Hoy `project-robin.com` reparte `/admin`, `/portal` y `/therobinplan` a varios sitios de Netlify con un Worker (`apps/portal/infrastructure/cloudflare/project-robin-router.js`).

Con el sitio unificado, esas rutas apuntarán al sitio de apps de este repositorio, y el Worker dejará de ser necesario. La web pública es un proyecto aparte.
