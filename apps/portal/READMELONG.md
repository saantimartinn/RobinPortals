# Robin Platform — guía técnica extendida

> **¿Primera vez en el código?** Empieza por la [USERGUIDE](USERGUIDE.md), un recorrido desde la sesión y la UI hasta Functions, datos, Cloudflare y los contratos con los repos vecinos.
>
> Para los recorridos funcionales completos, abre [DATAFLOW](docs/DATAFLOW.md); para los flujos de datos personales, consulta [PRIVACY_DATA_MAP](docs/PRIVACY_DATA_MAP.md).

## Rol del repositorio

Robin Platform contiene el Portal del Alumno, su administración de aplicación y
las Functions que sirven esas experiencias. Es una app del monorepo; el build
unificado en `site/build.mjs` publica sus archivos y Functions con las otras
tres apps en un único sitio Netlify. El Worker vigente está en
[`infra/cloudflare/project-robin-router.js`](../../infra/cloudflare/project-robin-router.js)
y envía los prefijos de las apps a ese sitio sin cambiar la ruta.

Portal del Alumno participa como proveedor principal de identidad y datos de aplicación. Robin Admin comparte su login desde el dominio público; Robin Community mantiene identidad de suscriptor y almacenamiento propios, con un endpoint SSO validado contra Portal.

## Arquitectura de runtime

```mermaid
flowchart LR
  Browser --> CF[Cloudflare Worker]
  CF -->|rutas de las cuatro apps| Site[Netlify unificado]
  Site --> Platform[Portal del Alumno]
  Site --> Admin[Admin]
  Site --> Subs[Robin Community]
  Site --> Jr[Robin Jr]
  Platform --> Edge[Netlify Edge rate limits]
  Edge --> Functions[Netlify Functions]
  Functions --> Lib[lib domain services]
  Functions --> Shared[shared cross-runtime rules]
  Lib --> DB[(Supabase application DB / Storage)]
  Lib --> Providers[Revolut · Google · Holded · Notion · Anthropic · Resend]
```

Cloudflare conserva la web pública para rutas no reconocidas. Las rutas de las apps llegan al sitio Netlify unificado; las API se resuelven con el `netlify.toml` generado en la raíz a partir de la configuración de cada app.

## Estructura y propiedad

### `portal-source/`

Aplicación React/Vite. `src/main.jsx` arranca React, `src/app.jsx` gestiona sesión, selección de administrador/alumno y onboarding, `src/api.js` es la fachada pública del cliente HTTP y reexporta módulos de `src/api/`. Las pantallas principales están separadas en `src/application/`, onboarding por pasos en `src/application/onboarding/`, administración en `src/application/admin/` y funciones de producto dentro de `src/application/` y `src/application/careers/`. Las reglas de permisos del menú se mantienen en `src/admin-permissions.js`; los controles de servidor siguen siendo autoridad.

Vite construye con base `/portal/`; `site/build.mjs` incorpora esa salida al directorio publicado del sitio unificado. Las APIs usan same-origin cookies, excepto las subidas de binarios que reciben URLs firmadas desde el backend.

### `netlify/functions/`, `netlify/edge-functions/`, `lib/`, `shared/`

- Functions reciben peticiones, validan método/origen/session/roles y delegan reglas en `lib/`.
- Edge Functions aplican límites de abuso a rutas configuradas antes de entrar al handler.
- `lib/` ofrece integraciones backend y lógica reutilizable (Supabase, identity, pagos Revolut, PDFs, Google, Holded, Drive, calendario, Notion, email, IA y observabilidad).
- `shared/` guarda solo reglas que deben coincidir exactamente entre runtime Node y frontend (contrato, importes, roles y política de contraseña).

La asignación completa route → handler y handler → servicio está en [API_INVENTORY](docs/API_INVENTORY.md), [API_CONTRACTS](docs/API_CONTRACTS.md) y el [USERGUIDE](USERGUIDE.md).

## Flujo del alumno

1. `portal-source/src/app.jsx` llama `apiMe()` mediante `portal-source/src/api.js`.
2. Sin sesión, presenta login o el selector de portal en `/login`; con sesión, clasifica principal y rol.
3. Un alumno nuevo entra al primer paso pendiente de `application/onboarding/`: origen, DNI, contrato, perfil o checkout.
4. Cada paso llama endpoint de `/api/onboarding/*`; Functions accede a Supabase, firma URL de storage y usa proveedores según el paso.
5. El shell del portal muestra estado, perfil, pagos, carreras, documentos, reservas y FAQs de acuerdo con los flags y permisos actuales.

Mentoría tiene una cuota única de 666,33 €. Un admin puede convertir una cuenta
abonada a General, Delft o Llegada desde la ficha. El pago anterior se conserva
y se descuenta de la primera cuota nueva; General estándar queda cubierto sin
otro checkout. El alumno firma el contrato del nuevo programa. El detalle está
en [Mentoría y conversión](docs/MENTORIA_CONVERSION.md).

## Flujo de administración

El usuario administrativo se resuelve en `portal-source/src/app.jsx` y entra a `AdminPortal` si `isAdminUser()` lo confirma. Los componentes `Admin*` consultan datos por la misma fachada API; `portal-source/src/admin-permissions.js` delimita visibilidad de áreas y el backend verifica rol, alcance y ownership en cada Function. Robin Admin es otra app del mismo monorepo y sitio; su UI de `/admin` consume identidad común vía `/portal/api/*` y API de gestión propia desde `/api/admin/*`.

## Identidad, persistencia e integraciones

- Cookie HttpOnly firmada en backend; `lib/auth.js`, `lib/identity.js` y `lib/authorization.js` centralizan principales, sesión y guards.
- Supabase es la DB de aplicación y storage; service-role key solo en Functions. Las tablas y accesos se describen en `docs/DATABASE_CURRENT.md` y `docs/AUTHORIZATION.md`.
- Revolut es el proveedor de checkout de aplicación (no Stripe); webhooks validan firma y reconciliación usa estado persistido e ID de pago.
- Google Drive, Sheets, Gmail, Calendar/Meet, Holded, Notion, Anthropic y Resend se encapsulan en `lib/`.
- `webhook_log` y servicios de reintento/idempotencia sostienen eventos externos; no reintentar pagos o emails sin confirmar ID/estado.

## Build, publicación y rutas

- Root package: backend y tooling; `portal-source/package.json`: frontend Vite/React.
- `netlify.toml` instala `portal-source`, construye y copia su `dist/` a `deploy/portal`, además declara funciones, redirects, headers, cron y Edge routes.
- `infrastructure/cloudflare/project-robin-router.js` maneja subpaths globales y preserva WordPress como fallback.
- Las guías existentes cubren operación en [OPERATIONS.md](docs/OPERATIONS.md), configuración en [ENVIRONMENT.md](docs/ENVIRONMENT.md), y flujos de host en [CLOUDFLARE_ROUTING.md](docs/CLOUDFLARE_ROUTING.md).

## Repositorios conectados

| Proyecto | Flujo compartido | Guías |
|---|---|---|
| [Robin Admin](../admin/README.md) | Login, perfiles administrativos, leads, clientes e integraciones administrativas. | [README largo](../admin/READMELONG.md), [USERGUIDE](../admin/USERGUIDE.md), [arquitectura](../admin/docs/ARCHITECTURE.md). |
| [Robin Subscriptions](../community/README.md) | Acceso cross-portal y SSO desde sesión de aplicación; usuario, cookie y base de datos de suscripción siguen separados. | [README largo](../community/READMELONG.md), [USERGUIDE](../community/USERGUIDE.md), [arquitectura](../community/docs/ARCHITECTURE.md). |

Las cuatro apps comparten el build del sitio, pero conservan Functions, variables
de entorno y reglas de dominio propias. Los cambios de identidad, API o rutas
requieren comprobar todos los consumidores y regenerar `netlify.toml` de raíz.
