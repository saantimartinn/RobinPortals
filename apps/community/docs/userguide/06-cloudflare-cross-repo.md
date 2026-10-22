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


## Secuencia de comprobación de routingSecuencia de comprobación de routing

Para una petición desde el dominio público, examina primero la coincidencia de ruta Worker. Para `/therobinplan/`, el prefijo se conserva para localizar el artefacto compilado. Para `/therobinplan/api/*`, el Worker quita el prefijo antes de enviar `/api/*` al origin. Después Netlify aplica el redirect de API o el fallback SPA. Un acceso al hostname Netlify directo puede seguir otro path base.

Al tocar el prefijo o la detección de hostname, inspecciona `frontend/src/api/index.js`, Vite base/outDir, `netlify.toml` y Worker de Platform en el mismo cambio conceptual. Revisa asset paths, query, cookies y navegación de retorno.

El SSO es un contrato diferente de routing: Platform verifica identidad de aplicación y Subscriptions crea sesión propia. Coordina [Platform USERGUIDE](https://github.com/RobinManuV/Robin-platform-cliente/blob/main/USERGUIDE.md) y [Admin USERGUIDE](https://github.com/RobinManuV/Robin-Admin/blob/main/USERGUIDE.md); los contratos de sesión no comparten secrets ni base de cuentas.

---

**USERGUIDE:** [Índice](../../USERGUIDE.md) · [← Anterior](./05-data-security-and-operations.md) · [Siguiente documento de lectura →](./07-source-file-reference.md) · [READMELONG](../../READMELONG.md)
