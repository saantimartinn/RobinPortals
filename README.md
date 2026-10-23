# Project Robin

Monorepo del portal del alumno, Robin Jr, Robin Community y el admin. Las cuatro apps se publican como **un único sitio de Netlify**. La web pública es un proyecto aparte y no forma parte de este repositorio.

## Estructura

- `apps/portal` — portal del alumno y login común (`/portal`, `/login`)
- `apps/robinjr` — Robin Jr (`/robinjr`)
- `apps/community` — Robin Community (`/therobinplan`)
- `apps/admin` — admin (`/admin`, funciones en `/api/admin`, `/api/internal`, …)
- `packages/auth` — cookies, HTTP y URL del sitio compartidos
- `packages/portal-nav` — enlaces entre portales
- `site/` — herramientas del sitio unificado (config, build, entorno, tests)
- `dev/` — arranque local (ver `dev/README.md`)

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Arranca todo en local en http://localhost:8888 |
| `npm test` | Tests de las cuatro apps |
| `npm run site:config` | Regenera `netlify.toml` a partir de `apps/*/netlify.toml` |
| `npm run site:build` | Compila el sitio en `site/.output` |
| `npm run site:env` | Regenera `./.env` a partir de `apps/*/.env` |
| `npm run site:pull-env` | Copia a `apps/*/.env` las variables de cada proyecto de Netlify (solo lectura) |
| `npm run site:netlify-env -- --site-url https://<sitio>.netlify.app` | Prepara en `.netlify/production-env.json` las variables del sitio de producción (no envía nada) |

`netlify.toml` de la raíz es generado: cada app sigue definiendo sus rutas en su propio `netlify.toml`, y `site/generate-config.mjs` las monta bajo su ruta y renombra sus funciones con el prefijo de la app.

## Producción

- **Build:** `node site/build.mjs --install --embed-env` (lo fija `netlify.toml`). Netlify da a las funciones como mucho 4 KB de variables y las cuatro apps necesitan unos 10 KB, así que las variables de cada app (`PORTAL__…`, `ROBINJR__…`, `COMMUNITY__…`, `ADMIN__…`) van en Netlify **solo para el build** y el build las embebe en los paquetes de funciones (`site/app-env.cjs` las lee). En las funciones solo quedan `PUBLIC_BASE_URL`, `ROBIN_SITE_URL` y `ALLOWED_ORIGINS`.
- **Variables:** `npm run site:netlify-env -- --site-url …` genera el fichero para `netlify api createEnvVars`, con `JWT_SECRET` nuevos, y lista los secretos que hay que poner a mano porque Netlify no deja leer su valor de producción.
- **Tareas programadas:** no hacen nada hasta que el sitio tenga `ROBIN_RUN_SCHEDULED=true` (`site/app-env.cjs`). Se activa el día del cambio, a la vez que se apagan los sitios antiguos, para no duplicar envíos como las felicitaciones de cumpleaños.
- **Enrutado:** `infra/cloudflare/project-robin-router.js` (Worker de project-robin.com).
