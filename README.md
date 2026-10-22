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

`netlify.toml` de la raíz es generado: cada app sigue definiendo sus rutas en su propio `netlify.toml`, y `site/generate-config.mjs` las monta bajo su ruta y renombra sus funciones con el prefijo de la app.
