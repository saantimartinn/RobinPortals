# USERGUIDE — Robin Platform cliente

Guía técnica de incorporación al portal de aplicación y alumnos. Está organizada para seguir una petición entre el navegador, la sesión, los redirects, Netlify Functions, la lógica backend y los datos. También muestra dónde Robin Admin y Robin Subscriptions dependen de contratos de Platform.

> Empieza aquí si eres nuevo en el código. [READMELONG](READMELONG.md) ofrece la vista técnica extendida; esta guía es el índice de trabajo y enlaza los detalles por capa.

## Papel de Robin Platform

Este repositorio implementa el portal cliente/alumno, los flujos de aplicación y onboarding, APIs de perfil y operaciones relacionadas, y la identidad de aplicación que consume Robin Admin y que puede validar Robin Subscriptions durante su SSO. El Worker de Cloudflare para las rutas públicas de los tres productos también está versionado aquí, bajo `infrastructure/cloudflare/`.

La UI principal está bajo `portal-source/src/`; el build de Netlify publica `deploy/portal`. Los entrypoints HTTP, lógica server-side, shared helpers, SQL y configuración tienen sus propios límites: la estructura actual está resumida en [ARCHITECTURE](docs/ARCHITECTURE.md) y el [FILE_MAP](docs/FILE_MAP.md). Revisa `netlify.toml` y `package.json` para el contrato vigente de build y dev.

## Cómo empezar a investigar

1. Determina si el problema ocurre en UI, endpoint, login/session, build/routing o datos.
2. Mira URL/host/path: `/portal/` y `/portal/api/*` en el dominio común pasan por Cloudflare; el Worker está en este repo. Compara el path recibido con la regla de [CLOUDFLARE_ROUTING](docs/CLOUDFLARE_ROUTING.md).
3. En el frontend, entra por `portal-source/src/app.jsx` y la API pública `portal-source/src/api.js`; desde ahí sigue a las subcarpetas `api/`, features y componentes.
4. En backend, resuelve la ruta en `netlify.toml`, confirma el archivo bajo `netlify/functions/`, luego sigue sus imports a `lib/`, `shared/` o Supabase.
5. Para un contrato con otro repo, abre también el capítulo [06 · Cloudflare y flujos cross-repo](docs/userguide/06-cloudflare-and-cross-repo.md) y la guía del consumidor.

Los [mapas generados](docs/codebase/README.md) ayudan a localizar archivos; no reemplazan el código cuando se necesita confirmar el comportamiento.

## Recorrido de una petición

```text
Browser → portal-source/src/app.jsx / feature
  → portal-source/src/api.js (fachada pública estable)
  → portal-source/src/api/<domain>.js
  → URL /api/... o /portal/api/...
  → netlify.toml → netlify/functions/<handler>.js
  → lib/* / shared/* → Supabase o integración
```

El helper de sesión y el flujo de login son una ruta lateral importante: una API protegida depende del principal validado en backend, cookies, configuración del entorno y, para identidad de aplicación, del proveedor Supabase/Platform configurado. No equipares “el componente considera al usuario admin” con autorización efectiva.

## Mapa del repositorio

| Ruta | Propósito al navegar el código |
|---|---|
| `portal-source/src/app.jsx` | Entrada de aplicación y selección de estados/pantallas raíz. |
| `portal-source/src/api.js` | Fachada de compatibilidad que reexporta los módulos `api/*`; conserva imports usados por features. |
| `portal-source/src/api/` | Operaciones HTTP agrupadas por dominio. |
| `portal-source/src/features/` | UI y flujos de aplicación, perfil y áreas del portal. |
| `portal-source/src/` restante | Shell, shared UI/helpers, estilos y recursos de frontend. |
| `netlify/functions/` | Adaptadores de rutas HTTP, webhooks y tareas serverless. |
| `lib/`, `shared/` | Reglas servidor y código reutilizable entre handlers/entornos. Verifica si cada módulo es browser-safe antes de importar. |
| `supabase/` | Configuración, SQL versionado y contratos con la persistencia. |
| `infrastructure/cloudflare/project-robin-router.js` | Worker que decide los destinos por hostname/path y transforma solicitudes/respuestas. |
| `netlify.toml` | Build/publish, Functions, redirects, Edge y headers. |
| `scripts/`, `test/` | Comprobaciones, generación de mapas y pruebas declaradas por el repo. |
| `docs/codebase/` | Árbol de carpetas para recorrer archivos fuente con enlaces. |

## Itinerarios de lectura

| Trabajo | Capítulos y fuentes |
|---|---|
| Entender sesión y SSO | [01 · Runtime e identidad](docs/userguide/01-runtime-and-identity.md) → `session.js`, `api/auth-onboarding.js`, auth handlers y permisos. |
| Cambiar portal cliente | [02 · Frontend cliente](docs/userguide/02-client-frontend.md) → `app.jsx` → feature/shared UI → `api.js`. |
| Cambiar aplicación o admin | [03 · Application y admin UI](docs/userguide/03-application-and-admin-ui.md) → shell/feature → API → permiso backend. |
| Cambiar endpoint | [04 · API, Functions y servicios](docs/userguide/04-api-functions-and-services.md) → redirects → Function → lib/shared → datos. |
| Cambiar datos/proveedor o seguridad | [05 · Datos, integraciones y seguridad](docs/userguide/05-data-integrations-security.md). |
| Cambiar ingress, SSO o interacción entre productos | [06 · Cloudflare y flujos cross-repo](docs/userguide/06-cloudflare-and-cross-repo.md). |
| Encontrar un archivo y recorrer sus referencias | [07 · Referencia por archivo](docs/userguide/07-source-file-reference.md) → árbol por carpeta → source. |

Cada capítulo enlaza el anterior y el siguiente, y apunta a los capítulos equivalentes de Admin y Subscriptions cuando comparten un contrato.

**Lectura secuencial:** empieza por [01 · Runtime, identidad y roles](docs/userguide/01-runtime-and-identity.md). Al final de cada capítulo sigue el enlace “Siguiente documento de lectura” hasta [07 · Referencia por archivo](docs/userguide/07-source-file-reference.md); desde allí puedes volver a este índice.

## Cambios que exigen coordinación

- **Identidad Platform**: revisa emisión/lectura de sesión, cookie, claims de admin, `/api/me`, roles/scopes y el cliente de Robin Admin. Subscriptions consulta identidad de origen por su propio endpoint SSO; su sesión local permanece separada.
- **Rutas públicas**: un cambio al Worker, prefijos de UI, eliminación de prefijo API, redirects de Netlify, build output o assets tiene que concordar con `netlify.toml` y la base de Vite del producto destino.
- **Permisos**: cambiar nombres de capability/roles implica consumidor UI, endpoint y datos de permisos. El control definitivo reside server-side.
- **Datos**: sigue el schema y las migraciones concretas; revisa RLS, índices, escritura/lectura y consumidores antes de alterar filas o campos.
- **Errores y payloads**: confirma si clientes esperan JSON, código HTTP, cookie o redirect; no cambies silenciosamente la forma de respuesta.

## Desarrollo y diagnóstico

Los comandos válidos están en `package.json`; las decisiones de publish y routing están en `netlify.toml`. Inicia con el flujo de desarrollo integrado documentado por el repo para que el navegador pueda alcanzar tanto Vite como Functions. Si reproduces un fallo de producción, apunta el host, path, respuesta de Cloudflare/Netlify, consola de navegador y logs backend sin incluir cookies, tokens ni PII.

Para un fallo de UI vacía, examina respuesta de documento, bundle JS/CSS, base del build y errores de carga. Para un 404 API, resuelve la URL pública primero en el Worker y luego en Netlify redirects. Para 401/403, distingue falta de cookie, expiración, identidad de origen no disponible y permiso/scoping insuficiente. Para una pantalla con datos erróneos, sigue la query hasta el schema y confirma transformaciones.

## Documentos de referencia

- [READMELONG](READMELONG.md) · diseño del producto, dominios y release.
- [Arquitectura](docs/ARCHITECTURE.md) · carpetas y límites de dependencia.
- [Cloudflare y routing](docs/CLOUDFLARE_ROUTING.md) · Worker, destinos y snapshot del dashboard.
- [API inventory](docs/API_INVENTORY.md) · endpoint candidato → handler.
- [Dataflow](docs/DATAFLOW.md) · sesión, onboarding, archivos, pagos, integraciones y consumidores vecinos.
- [FILE_MAP](docs/FILE_MAP.md) · mapa explicativo mantenido.
- [Referencia por archivo de la USERGUIDE](docs/userguide/07-source-file-reference.md).
- [Robin Admin USERGUIDE](https://github.com/RobinManuV/Robin-Admin/blob/main/USERGUIDE.md).
- [Robin Subscriptions USERGUIDE](https://github.com/saantimartinn/robin-subscriptions/blob/main/USERGUIDE.md).

**Volver al inicio:** [USERGUIDE](USERGUIDE.md) · [README largo](READMELONG.md)
