# Desarrollo local

Desde la raíz del monorepo:

```sh
npm run dev
```

Arranca todo con la misma forma que tendrá producción:

| URL | Qué es |
| --- | --- |
| http://localhost:8888 | Entrada única (`dev/proxy.mjs`), hace de `project-robin.com` |
| http://localhost:8888/portal/ | Portal del alumno (y `/login`, el login común) |
| http://localhost:8888/robinjr/ | Robin Jr |
| http://localhost:8888/therobinplan/ | Robin Community |
| http://localhost:8888/admin/ | Admin |
| http://localhost:8888/ | Web pública (`Web-robin`, repositorio aparte) |

Por detrás:

- **8889**: el sitio de apps (`netlify dev` en la raíz). Sirve los cuatro frontends compilados en `site/.output/public` y las funciones de todas las apps con su prefijo (`portal-*`, `robinjr-*`, `community-*`, `admin-*`). Los frontends se recompilan solos al guardar (`vite build --watch`); recarga la página para ver el cambio.
- **8890**: la web (`netlify dev` dentro de `Web-robin`, con Astro en 4321).

El proxy manda `/portal`, `/robinjr`, `/therobinplan`, `/admin`, `/login`, `/api/admin/*` y `/api/internal/*` al sitio de apps, y todo lo demás a la web.

## Variables de entorno

`npm run dev` genera `./.env` (ignorado por Git) a partir de `apps/*/.env` con `site/env.mjs`. Son **credenciales reales**: Supabase, Revolut, Stripe, correo, etc. de producción.

Las variables que tienen valores distintos según la app conservan el valor de portal/admin con el nombre normal; el resto de apps las leen con prefijo:

| App | Variables propias |
| --- | --- |
| Robin Jr | `JR_SUPABASE_URL`, `JR_SUPABASE_SERVICE_ROLE_KEY`, `JR_REVOLUT_API_BASE`, `JR_REVOLUT_MERCHANT_SECRET_KEY`, `JR_REVOLUT_WEBHOOK_SIGNING_SECRET` |
| Community | `COMMUNITY_SUPABASE_URL`, `COMMUNITY_SUPABASE_SERVICE_ROLE_KEY`, `COMMUNITY_JWT_SECRET`, `COMMUNITY_STRIPE_WEBHOOK_SECRET` |
| Admin | `ADMIN_DEFAULT_PASSWORD` |

Si aparece una variable nueva con valores distintos entre apps, `site/env.mjs` se detiene y la indica; hay que añadirla a `SCOPED` y leerla con prefijo en el código de esa app.
