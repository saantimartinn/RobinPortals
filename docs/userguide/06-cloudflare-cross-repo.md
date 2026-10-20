# 06 · Cloudflare y relaciones cross-repo

## Cloudflare ingress

El Worker vive en Robin Platform y toma `project-robin.com/therobinplan/*` hacia este Netlify origin. Conserva el prefijo en UI porque Vite `base` y `outDir` son `therobinplan`; solo para `/therobinplan/api/*` quita prefijo y deja que este `netlify.toml` encuentre su handler. No añadir prefijo adicional al `api/index.js` mientras la regla Worker esté activa.

Detalles y tabla de todos los repos: [CLOUDFLARE_ROUTING.md](../CLOUDFLARE_ROUTING.md) y [Robin Platform routing](https://github.com/RobinManuV/Robin-platform-cliente/blob/main/docs/CLOUDFLARE_ROUTING.md).

## Responsabilidades por repositorio

- [Robin Platform](https://github.com/RobinManuV/Robin-platform-cliente): alumno/application, onboarding y sesión de origen; [USERGUIDE](https://github.com/RobinManuV/Robin-platform-cliente/blob/main/USERGUIDE.md).
- [Robin Admin](https://github.com/RobinManuV/Robin-Admin): panel de staff, CRM, finanzas y métricas; [USERGUIDE](https://github.com/RobinManuV/Robin-Admin/blob/main/USERGUIDE.md).
- Este repositorio: subscription, billing, comunidad y datos propios; [READMELONG](../../READMELONG.md).

## Cambios coordinados

Coordinar si se modifica cookie scope, SSO contract, user/profile IDs, role strings, tab permissions, cross-portal nav, origin URL, Worker routes, payment callback, API error shapes o storage. Versionar primero al consumer con backward compatibility y después al provider; no fusionar esquemas distintos por similitud de tablas.
