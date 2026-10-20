# USERGUIDE — Robin Platform

Punto de entrada técnico para recorrer el proyecto, entender qué parte corre en navegador, qué parte corre en Netlify y cómo sigue una petición hasta base de datos, proveedor y los repos vecinos. El inventario enlaza archivos, exports detectados y dependencias; la guía explica responsabilidades y contratos.

## Árbol

```text
USERGUIDE.md
├── docs/userguide/01-runtime-and-identity.md
├── docs/userguide/02-client-frontend.md
├── docs/userguide/03-application-and-admin-ui.md
├── docs/userguide/04-api-functions-and-services.md
├── docs/userguide/05-data-integrations-security.md
├── docs/userguide/06-cloudflare-and-cross-repo.md
├── docs/ARCHITECTURE.md
├── docs/CLOUDFLARE_ROUTING.md  ← referencia principal del Worker
├── docs/API_INVENTORY.md / docs/API_CONTRACTS.md
└── docs/codebase/README.md → carpetas → archivos, responsabilidades y enlaces
```

## Ruta de lectura por pregunta

| Pregunta | Orden recomendado |
|---|---|
| ¿Qué se publica y desde dónde? | [Runtime e identidad](docs/userguide/01-runtime-and-identity.md) → [Arquitectura](docs/ARCHITECTURE.md) → [OPERATIONS](docs/OPERATIONS.md). |
| ¿Cómo llega el browser a esta versión? | [Cloudflare/enrutamiento](docs/CLOUDFLARE_ROUTING.md) → `infrastructure/cloudflare/project-robin-router.js` → `netlify.toml`. |
| ¿Cómo funciona onboarding/portal? | [Frontend](docs/userguide/02-client-frontend.md) → [UI por dominio](docs/userguide/03-application-and-admin-ui.md) → [API](docs/userguide/04-api-functions-and-services.md). |
| ¿Qué hace una ruta HTTP? | [API/Functions](docs/userguide/04-api-functions-and-services.md) → [API_INVENTORY](docs/API_INVENTORY.md) → `netlify/functions/<name>.js` → `lib/`. |
| ¿Afecta a Admin o The Robin Plan? | [Flujos cross-repo](docs/userguide/06-cloudflare-and-cross-repo.md) → los USERGUIDE de ambos repos. |

## Mapa fuente

- [Frontend (`portal-source/`)](docs/codebase/portal-source/README.md): aplicación React, pasos, pantallas, API y assets.
- [Functions y Edge](docs/codebase/netlify/README.md): handlers, cron y protecciones.
- [`lib/`](docs/codebase/lib/README.md) y [`shared/`](docs/codebase/shared/README.md): servicios de backend y reglas compartidas.
- [Infraestructura Worker](docs/codebase/infrastructure/README.md): código Cloudflare, cuyo flujo se explica en [CLOUDFLARE_ROUTING](docs/CLOUDFLARE_ROUTING.md).
- [Scripts](docs/codebase/scripts/README.md), tests, migraciones y CI: gates y fuentes operativas.
- [Mapa técnico mantenido](docs/FILE_MAP.md), [índice generado](docs/FILE_INDEX.generated.md), [componentes](docs/COMPONENT_MAP.md) e [API](docs/API_INVENTORY.md).

## Guías de capa

- [01 · Runtime, identidad y roles](docs/userguide/01-runtime-and-identity.md)
- [02 · Cliente, sesión y API frontend](docs/userguide/02-client-frontend.md)
- [03 · Aplicación, onboarding y superficies admin](docs/userguide/03-application-and-admin-ui.md)
- [04 · Endpoints, handlers y servicios](docs/userguide/04-api-functions-and-services.md)
- [05 · Persistencia, integraciones y seguridad](docs/userguide/05-data-integrations-security.md)
- [06 · Worker Cloudflare y relaciones entre repos](docs/userguide/06-cloudflare-and-cross-repo.md)

## Documentos generales

- [READMELONG](READMELONG.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Cloudflare y enrutamiento](docs/CLOUDFLARE_ROUTING.md)
- [API contracts](docs/API_CONTRACTS.md)
- [Environment](docs/ENVIRONMENT.md)
