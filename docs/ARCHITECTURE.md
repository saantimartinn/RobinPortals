# Arquitectura actual

Robin Platform es un monolito web desplegado en Netlify: una aplicación React/Vite,
Functions Node.js para HTTP y trabajos programados, y dos Edge Functions dedicadas a
limitación de abuso. Esta estructura conserva un único despliegue y fronteras de dominio
en código, sin introducir servicios adicionales durante la limpieza.

## Flujo de una petición

1. Netlify redirige `/` a `/portal/` y sirve el build desde `deploy/portal`.
2. El frontend usa rutas `/api/*` del mismo origen; `netlify.toml` las asigna a Functions.
3. Las rutas protegidas verifican origen, cookie de sesión firmada y autorización backend.
4. La Function orquesta servicios de `lib/`, que realizan validación, reglas de dominio y
   accesos a datos o proveedores.
5. El backend responde JSON/PDF/SSE y aplica `Cache-Control: no-store` a toda la API.

```mermaid
flowchart LR
  B[Navegador] -->|/portal/| N[CDN Netlify]
  B -->|/api/* + cookie| E[Edge rate limit]
  E --> F[Netlify Function]
  F --> S[Servicio de dominio en lib/]
  S --> D[(Tablas / Storage privados)]
  B -->|subida con URL firmada de un objeto| D
  S --> P[Proveedor externo]
  P -->|webhook firmado| F
  G[GitHub] -->|commit verificado| N
```

La `SUPABASE_SERVICE_ROLE_KEY` solo existe en el runtime servidor. El navegador únicamente
contacta el Storage del proyecto autorizado para subir un objeto a una URL firmada, temporal
y emitida por el backend; no recibe claves ni acceso general a Supabase. El último snapshot
conocido muestra RLS activo, pero no incluye el detalle de sus políticas; la barrera efectiva
del cliente de servidor se encuentra en cada Function. Véanse
[DATABASE_CURRENT.md](DATABASE_CURRENT.md) y [AUTHORIZATION.md](AUTHORIZATION.md).

## Capas

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Configuración de despliegue | `netlify.toml`, `.github/workflows/ci.yml` | Build, rutas, headers, schedules y gates |
| Protección Edge | `netlify/edge-functions/` | Rate limits previos a las Functions |
| Interfaz HTTP | `netlify/functions/` | Método, origen, sesión, autorización y respuesta |
| Dominio e integraciones | `lib/` | Reglas, orquestación y adaptadores de proveedores |
| Reglas compartidas | `shared/` | Contrato, importes y contraseña reutilizables |
| Frontend | `portal-source/src/` | Portales React de alumnos y administración |
| Evidencia y gates | `test/`, `scripts/`, documentación | Regresión, inventarios y controles estáticos |

### Contenido por carpeta

| Carpeta | Contenido |
|---|---|
| `portal-source/src/api/` | Módulos de cliente HTTP que preserva `src/api.js`. |
| `portal-source/src/application/` | Shell de alumnos, admin, navegación cross-portal y recursos de cada flujo. |
| `portal-source/src/application/onboarding/` | Formularios y componentes modulares del alta. |
| `portal-source/src/application/admin/` | Dashboard, pagos, documentos, clientes, carreras, reservas, notificaciones y perfil administrativo. |
| `portal-source/src/application/careers/`, `payments/`, `documents/` | Componentes de carrera, pagos/recibos y reglas de documentos. |
| `portal-source/src/shared/`, `assets/`, `public/` | Widgets, imágenes importadas y recursos descargables. |
| `netlify/functions/`, `netlify/edge-functions/` | HTTP/cron y rate-limit/abuse middleware. |
| `lib/`, `shared/` | Adaptadores y lógica servidor; reglas que deben ejecutarse iguales en Node y navegador. |
| `infrastructure/cloudflare/` | Worker de host público; no se empaqueta en Netlify. |
| `supabase/`, `test/`, `scripts/`, `.github/` | Evolución de datos, pruebas, inventarios/gates y CI. |
| `docs/` | Contratos mantenidos, guías por dominio y árboles generados. |

## Dominios

- **Identidad**: cookie JWT firmada y una raíz persistente `users` para alumnos/admins.
  No se usa Supabase Auth como identidad de aplicación.
- **Aplicación**: onboarding, expediente, carreras, documentos, pagos, reservas y chat.
- **Administración**: vistas y acciones para advisors y admins de aplicación.
- **Integraciones**: Revolut, Google, Holded, Resend, Anthropic y webhooks autenticados.

Los entrypoints conservan los detalles HTTP y delegan lógica reutilizable a `lib/`.
[API_INVENTORY.md](API_INVENTORY.md) enumera todas las Functions y
[FILE_MAP.md](FILE_MAP.md) explica a mano la relación entre módulos; el [índice generado](FILE_INDEX.generated.md) y el árbol localizan archivos por nombre.

Las Functions tienen un límite CI uniforme de 220 líneas físicas.

### Invariantes de frontend y backend

- La raíz React coordina sesión, onboarding y shell activo. Las vistas comparten widgets; un widget reutilizable no debe importar un portal completo ni crear ciclos.
- Cada flujo conserva el estado y las llamadas API en el módulo que lo posee; no añadir un store global o una capa de routing adicional sin una necesidad que el estado actual demuestre.
- La UI no es una barrera de permisos. La API del mismo origen y el backend deciden identidad y autorización; el navegador no recibe secretos ni SDKs de proveedor.
- Functions poseen HTTP, método, origen, auth y respuesta. Los servicios no deben leer eventos de Netlify: reciben identificadores y datos autenticados explícitos.
- Los archivos binarios académicos se transfieren directamente a Storage con URL firmada temporal; el backend valida ownership, destino, MIME y tamaño y conserva metadata.
- Mantener un despliegue mientras no exista una necesidad operativa medida para dividirlo. Los adaptadores que pueden reintentarse deben conservar idempotencia.
- Las extracciones deben regenerar mapas, resolver bindings/imports/ciclos y pasar el build; deben demostrar una mejora real y no crear abstracciones sin consumidores o duplicación que eliminen.

## Datos y archivos

Las tablas de aplicación residen en `public`; los buckets privados vigentes son
`dni-uploads` y `documents`. Las descargas se sirven mediante backend o URLs firmadas.
Las subidas académicas y de identidad usan tickets firmados de un solo destino para que el
binario no atraviese el límite de payload de Netlify; el backend valida ownership, ruta,
MIME y tamaño antes de guardar metadata o entregar la imagen al OCR.
`webhook_log` registra eventos operativos y también la cola de reintentos idempotentes.
No debe habilitarse acceso público/permanente desde navegador ni añadirse una migración
sin diseñar primero políticas y un rollback explícito.

## Build y despliegue

GitHub es la fuente versionada. CI instala ambos lockfiles, ejecuta gates y construye el
frontend. Netlify ejecuta su build desde el commit, copia `portal-source/dist` a
`deploy/portal` y despliega Functions/Edge Functions junto al estático. `deploy/` y
`node_modules/` son artefactos regenerables y no se versionan.

Los límites de identidad y permisos se desarrollan en [IDENTITY_MODEL.md](IDENTITY_MODEL.md),
y el despliegue en [OPERATIONS.md](OPERATIONS.md).

Para bajar desde estas capas hasta cada carpeta y archivo concreto, usa el
[árbol navegable del repositorio](codebase/README.md).
