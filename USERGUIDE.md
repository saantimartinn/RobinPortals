# USERGUIDE — Robin Subscriptions

Guía de incorporación para The Robin Plan. Permite a un programador nuevo recorrer la app desde su shell React, a través del cliente API y los Netlify Functions, hasta las reglas de negocio y la base Supabase propia. También explica qué contratos comparte con los otros portales y cuáles deben seguir independientes.

> Empieza aquí. [READMELONG](READMELONG.md) amplía el contexto técnico; los seis capítulos enlazados abajo son la guía detallada para trabajar por capas.

## Modelo del producto

Subscriptions es una aplicación independiente que ofrece el portal de suscriptor, administración del producto, facturación, comunidad y servicios relacionados con The Robin Plan. Tiene frontend React/Vite, Netlify Functions y Supabase propios. La cookie JWT y sus claves de firma pertenecen a este producto.

Robin Platform puede actuar como fuente de identidad de aplicación durante el intercambio SSO. Ese intercambio autentica y enlaza una cuenta local de suscriptor; no convierte Platform en la base de datos de Subscriptions ni comparte la sesión/JWT de Platform. Robin Admin es un vecino funcional y no es el runtime del portal.

La aplicación se publica bajo `/therobinplan/` en el dominio común. El Worker de Cloudflare está en el repo Platform. El build usa el workspace `frontend` y publica `dist/`; confirma `package.json`, `frontend/vite.config.*` y `netlify.toml` antes de cambiar rutas o salida.

## Primer recorrido por el código

```text
index.html → frontend/src/main.jsx → frontend/src/app.jsx
  → SubscriberAuthScreen / SubscriberPortal / SubscriberAdmin
  → frontend/src/api/index.js
  → /api/... → netlify.toml → backend/functions/<handler>.js
  → backend/lib/* → Supabase propia / Stripe / otro proveedor
```

La entrada UI consulta primero `/api/me`. Cuando no existe sesión local y la respuesta es 401, intenta el handshake `/api/auth/sso` y vuelve a consultar su sesión. Luego la UI escoge el área por principal local y, para un admin, vuelve a comprobar identidad/scope de aplicación. Estos pasos se describen con más detalle en [01 · Sesión y SSO](docs/userguide/01-app-session-and-sso.md).

## Directorios y límites

| Ruta | Responsabilidad |
|---|---|
| `frontend/src/main.jsx`, `app.jsx` | Arranque y selección de estado de sesión, login, portal o admin. |
| `frontend/src/application/` | Shells del portal, navegación entre productos y selector/flujo de suscripción. |
| `frontend/src/features/` | Funcionalidades de auth, suscripción, perfil, carrera, servicios, niveles, comunidad y admin. |
| `frontend/src/api/index.js` | Cliente HTTP público utilizado por features; URL base, cookies, JSON/form-data, errores y operaciones exportadas. |
| `frontend/src/shared/` | Componentes/estilos/utilidades browser-safe. No coloques secretos ni controles de autorización confiables aquí. |
| `backend/functions/` | Límite HTTP: método, origen, autenticación, validación, status/headers y delegación. |
| `backend/lib/` | Principal local, autorización, Supabase, billing y servicios externos/dominio. |
| `supabase/migrations/` | Esquema versionado del producto; no asumir que equivale al schema Platform. |
| `scripts/`, `test/` | Comprobación de arquitectura, generación documental y pruebas declaradas. |
| `netlify.toml` | Build/publicación, API redirects, fallback de SPA y cabeceras. |
| `docs/codebase/` | Índices que llevan de carpetas al source; consulta el archivo para confirmar el contrato real. |

Usa el [árbol de código](docs/codebase/README.md), el [mapa mantenido](docs/FILE_MAP.md) y el [inventario API](docs/API_INVENTORY.md) para localizar puntos de entrada; al hacer un cambio confirma referencias y código consumidor.

## Elige el itinerario

| Tu tarea | Guía recomendada |
|---|---|
| Login, expiración, cookie, roles o SSO | [01 · App, sesión y SSO](docs/userguide/01-app-session-and-sso.md) |
| Una pantalla del suscriptor o la API del navegador | [02 · Frontend suscriptor](docs/userguide/02-subscriber-frontend.md) |
| Herramientas de admin, comunidad, carrera o servicios | [03 · Admin y funcionalidades](docs/userguide/03-admin-and-community-features.md) |
| Nuevo endpoint, webhook o regla backend | [04 · API y backend](docs/userguide/04-api-and-backend.md) |
| Persistencia, secretos, proveedor, build u operación | [05 · Datos, seguridad y operación](docs/userguide/05-data-security-and-operations.md) |
| Worker, path público o cambio compartido | [06 · Cloudflare y repos vecinos](docs/userguide/06-cloudflare-cross-repo.md) |
| Encontrar un archivo y recorrer sus consumidores | [07 · Referencia por archivo](docs/userguide/07-source-file-reference.md) → árbol por carpeta → source |

Los capítulos tienen navegación anterior/siguiente para leerlos como recorrido y enlaces a los otros repos cuando una frontera requiere cambiar dos lados.

**Lectura secuencial:** empieza por [01 · App, sesión y SSO](docs/userguide/01-app-session-and-sso.md). Al final de cada capítulo sigue el enlace “Siguiente documento de lectura” hasta [07 · Referencia por archivo](docs/userguide/07-source-file-reference.md); desde allí puedes volver a este índice.

## Cómo rastrear una funcionalidad

1. Encuentra el componente visible bajo `frontend/src/application/` o `frontend/src/features/<domain>/`.
2. Sigue el evento/acción al export correspondiente en `frontend/src/api/index.js`. Registra URL, verbo, forma del payload, cookies y respuesta/error esperados.
3. Resuelve la ruta en `netlify.toml` y [API_INVENTORY](docs/API_INVENTORY.md). Verifica el handler candidato en `backend/functions/`.
4. Comprueba el acceso a sesión y permiso en backend; los condicionales de la UI solo gobiernan presentación.
5. Sigue el handler a `backend/lib/`, a la tabla/migración o a la integración. Para escrituras identifica ownership, efectos laterales, idempotencia y reintentos.
6. Comprueba consumidores del schema/contrato y actualiza la documentación de dominio pertinente.

Para webhooks/integraciones entrantes empieza por el route/handler y la validación de firma; después sigue escritura/reconciliación y el efecto que ve el usuario.

## Invariantes importantes

- Cuenta, roles (`subscriber`, `subscriber_admin`), cookie, JWT secret y DB pertenecen a Subscriptions.
- SSO consulta identidad de Platform desde backend. Nunca confíes en un email, rol, ID o scope enviado por el cliente como prueba de identidad.
- `subscriber_admin` por sí solo no garantiza acceso al panel de producto: el flujo actual comprueba además el scope de Platform `platform.robin_plan`. Los handlers también deben proteger cada acción.
- Stripe determina estado de cobro por webhook firmado y reconciliación en backend; no confíes en una URL de retorno como confirmación de pago.
- API y datos personales son server-side; no loggear contraseñas, cookies, token, documentos, prompts o payloads completos.
- La ruta de API que sale del cliente ya se reescribe para `/therobinplan/api/*` en el dominio compartido; coordina cualquier modificación con el Worker.

## Entorno y diagnóstico

`package.json` define Node mínimo, workspaces y scripts. `npm run dev` levanta Netlify Dev integrado con Vite/Functions; `npm run dev:frontend` sirve solo el frontend y no reemplaza backend. `npm run build` construye la salida publicada. Los comandos de comprobación disponibles están declarados en el manifest; no deduzcas que build aislado valida cambios de auth, datos o proveedor.

Para pantalla vacía, inspecciona consola, JS/CSS, base `/therobinplan/`, salida Vite y fallback SPA. Para 404 API, compara path del navegador, prefijo Worker, redirects y nombre de Function. Para 401/403, determina primero si falta cookie local, si SSO no pudo enlazar identidad, si el principal es de otro dominio o si falta scope. Para estado de pago incorrecto, sigue firma webhook → evento Stripe → mutation → consulta API → estado UI.

## Documentos y repos relacionados

- [READMELONG](READMELONG.md) · contexto técnico y dominios.
- [Arquitectura](docs/ARCHITECTURE.md) · módulos, capas y dependencias.
- [Cloudflare](docs/CLOUDFLARE_ROUTING.md) · rutas públicas y reescrituras.
- [API contracts](docs/API_CONTRACTS.md) y [operations](docs/OPERATIONS.md).
- [Dataflow](docs/DATAFLOW.md) · sesión/SSO, billing, comunidad, administración e integraciones.
- [Referencia por archivo de la USERGUIDE](docs/userguide/07-source-file-reference.md).
- [Robin Platform USERGUIDE](https://github.com/RobinManuV/Robin-platform-cliente/blob/main/USERGUIDE.md) · sesión de origen, portal cliente y Worker.
- [Robin Admin USERGUIDE](https://github.com/RobinManuV/Robin-Admin/blob/main/USERGUIDE.md) · panel interno y APIs administrativas.

**Volver al inicio:** [USERGUIDE](USERGUIDE.md) · [README largo](READMELONG.md)
