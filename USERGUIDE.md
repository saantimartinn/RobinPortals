# USERGUIDE — Robin Subscriptions / The Robin Plan

Guía raíz para navegar el repo y entender una acción desde pantalla, ruta y handler hasta datos y proveedores. `docs/FILE_MAP.md` explica manualmente las relaciones; `docs/FILE_INDEX.generated.md` y `docs/codebase/` son localizadores automáticos.

## Árbol de la guía

```text
USERGUIDE.md
├── docs/userguide/01-app-session-and-sso.md
├── docs/userguide/02-subscriber-frontend.md
├── docs/userguide/03-admin-and-community-features.md
├── docs/userguide/04-api-and-backend.md
├── docs/userguide/05-data-security-and-operations.md
├── docs/userguide/06-cloudflare-cross-repo.md
├── docs/ARCHITECTURE.md
├── docs/CLOUDFLARE_ROUTING.md
├── docs/API_INVENTORY.md / docs/API_CONTRACTS.md
└── docs/codebase/README.md → directorios → lista enlazada de archivos
```

## ¿Por dónde empiezo?

| Intención | Recorrido |
|---|---|
| Comprender el acceso al producto | [App, sesión y SSO](docs/userguide/01-app-session-and-sso.md) → `frontend/src/app.jsx` → `backend/functions/auth-*` → `backend/lib/auth.js` y `principal.js`. |
| Seguir una pantalla de alumno | [Frontend suscriptor](docs/userguide/02-subscriber-frontend.md) → feature → `frontend/src/api/index.js` → [API inventory](docs/API_INVENTORY.md). |
| Modificar un panel social/admin | [Features](docs/userguide/03-admin-and-community-features.md) → Function → `backend/lib/` y scope. |
| Cambiar endpoint/DB | [API/backend](docs/userguide/04-api-and-backend.md) → [API contracts](docs/API_CONTRACTS.md) → [DB current](docs/DATABASE_CURRENT.md). |
| Ver qué URL pública lo sirve | [Cloudflare routing](docs/CLOUDFLARE_ROUTING.md) → `netlify.toml` → `frontend/vite.config.js`. |
| Analizar impacto en otros productos | [Cross-repo](docs/userguide/06-cloudflare-cross-repo.md) → USERGUIDE de Robin Platform y Robin Admin. |

## Capas de código

- [Frontend](docs/codebase/frontend/README.md): aplicación React, API, UI shared y recursos.
- [Features](docs/codebase/frontend/src/features/README.md): auth, admin, community, career, profile, services, subscription y levels.
- [Backend](docs/codebase/backend/README.md), [Functions](docs/codebase/backend/functions/README.md) y [lib](docs/codebase/backend/lib/README.md).
- [Migrations](docs/codebase/supabase/migrations/README.md), seed demo, test, scripts y docs.
- [Mapa técnico mantenido](docs/FILE_MAP.md), [índice generado](docs/FILE_INDEX.generated.md), [COMPONENT_MAP](docs/COMPONENT_MAP.md), [API_INVENTORY](docs/API_INVENTORY.md).

## Guías técnicas

- [01 · Root app, sesión y SSO](docs/userguide/01-app-session-and-sso.md)
- [02 · Portal de suscriptor](docs/userguide/02-subscriber-frontend.md)
- [03 · Admin, comunidad, servicios y perfil](docs/userguide/03-admin-and-community-features.md)
- [04 · API y backend](docs/userguide/04-api-and-backend.md)
- [05 · Datos, seguridad y operación](docs/userguide/05-data-security-and-operations.md)
- [06 · Cloudflare y otros repos](docs/userguide/06-cloudflare-cross-repo.md)

## Documentos maestros

- [READMELONG](READMELONG.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Cloudflare y enrutamiento](docs/CLOUDFLARE_ROUTING.md)
- [Contrato y operación](docs/API_CONTRACTS.md), [OPERATIONS](docs/OPERATIONS.md)
