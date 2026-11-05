# Desarrollo local

Desde la raíz del monorepo:

```sh
npm run dev
```

Arranca todo con la misma forma que tendrá producción:

| URL | Qué es |
| --- | --- |
| http://localhost:8888 | Entrada única (`dev/proxy.mjs`) |
| http://localhost:8888/portal/ | Portal del alumno (y `/login`, el login común) |
| http://localhost:8888/robinjr/ | Robin Jr |
| http://localhost:8888/therobinplan/ | Robin Community |
| http://localhost:8888/admin/ | Admin |

Por detrás:

- **8889**: el sitio de apps (`netlify dev` en la raíz). Sirve los cuatro frontends compilados en `site/.output/public` y las funciones de todas las apps con su prefijo (`portal-*`, `robinjr-*`, `community-*`, `admin-*`). Los frontends se recompilan solos al guardar (`vite build --watch`); recarga la página para ver el cambio.

El proxy del 8888 lo manda todo al sitio de apps y solo adapta a `http://localhost` las cabeceras de seguridad de producción (quita `upgrade-insecure-requests` y HSTS). `/` lleva a `/portal/`.

## Variables de entorno

Cada app tiene su propio `apps/<app>/.env` con las mismas variables que su proyecto de Netlify actual (portal → `santipruebas`, Robin Jr → `robinjr`, Community → `suscriptions-santi`, Admin → `robin-admin-platform`). Son **credenciales reales** de producción. Para volver a copiarlas desde Netlify (solo lectura):

```sh
npm run site:pull-env            # las cuatro apps
npm run site:pull-env -- portal  # solo una
```

Netlify no deja leer el valor de producción de las variables secretas; para esas se usa el valor del contexto `dev` de ese proyecto y, si no lo hay, el que ya estuviera en el `.env` local. El script avisa de cuáles son. El `.env` anterior queda en `apps/<app>/.env.bak`.

`npm run dev` junta los cuatro en `./.env` con un prefijo por app (`PORTAL__…`, `ROBINJR__…`, `COMMUNITY__…`, `ADMIN__…`). Cada función se ejecuta con el entorno de su app (`site/app-env.cjs`): ve sus variables con el nombre normal y no ve las de las demás apps, así que el código de cada app no cambia. Solo `PUBLIC_BASE_URL`, `ALLOWED_ORIGINS` y `ROBIN_SITE_URL` son del sitio y apuntan a localhost.

## Desarrolladores: tests y logs

En Admin, la pestaña **Desarrolladores** abre directamente **Tests**. Los resultados se guardan durante 24 horas para la revisión local del código actual. El pago completo de Revolut sandbox requiere completar el checkout con una tarjeta de prueba; se indican número, caducidad y CVV en la ficha. Las órdenes, facturas y usuarios de esta prueba son ficticios y se limpian al verificar o cancelar.

Cada ficha indica si ejecuta un flujo, servicio o comprobación de código, o si solo verifica estructura y configuración. El resumen muestra las pruebas completadas sin presentar las comprobaciones de esquema como una garantía de que el flujo entero funciona. El botón de información detalla qué se ha probado y qué queda fuera de cada resultado.

**Logs** tiene tres orígenes: eventos Robin guardados en las tres bases que los registran, registros de funciones/Edge y actividad de despliegues de Netlify, y registros de servicios de los cuatro proyectos Supabase (Admin CRM, Alumno, Robin Jr y Community). En local, Netlify usa la sesión del CLI y el sitio vinculado; en producción, configura `NETLIFY_AUTH_TOKEN` como variable privada para Functions (el `SITE_ID` lo proporciona Netlify). Las funciones se consultan en lotes de diez para evitar que el CLI falle cuando el sitio tiene muchas funciones. Para consultar los de Supabase dentro del panel, añade `SUPABASE_MANAGEMENT_ACCESS_TOKEN` al entorno privado de Admin con permiso `analytics_logs_read`; las service role keys no dan acceso a la API de gestión. Hasta entonces, la pestaña ofrece enlaces directos a los registros de cada proyecto en Supabase Studio. No pongas estos tokens en ninguna variable `VITE_`.
