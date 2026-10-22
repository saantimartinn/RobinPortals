# 06 · Cloudflare y contratos entre repos

## Rutas públicas

El Worker versionado en `infrastructure/cloudflare/project-robin-router.js` conoce `/admin`, `/login`, `/portal` y `/therobinplan`. Para rutas de API elimina el prefijo del producto donde se implementa el API same-origin. La guía [CLOUDFLARE_ROUTING](../CLOUDFLARE_ROUTING.md) es la referencia completa de paths, origins, headers y reescritura de assets.

## Admin login y datos

En `/admin`, Robin Admin llama identidad mediante `/portal/api/auth/*` y `/portal/api/me`, para que la cookie/session la gestione esta plataforma. Sus datos de negocio llaman `/api/admin/*`, que Cloudflare manda al origin de Robin Admin. Evitar mover ambos grupos al mismo upstream por accidente.

## SSO para The Robin Plan

Robin Subscriptions consulta su API propia bajo `/therobinplan/api/*`. `exchangeApplicationSession()` usa `/api/auth/sso` desde el origin de suscripción; el backend consulta sesión Platform a través de API publicada. Una sesión Platform no prueba que el usuario tenga suscripción. Subscriptions valida coincidencia por identidad válida y crea JWT/cookie independiente.

## Interfaces de cambio coordinado

Cambios de ruta, role key, permisos de menú, profile fields, cookies, sesión, formato de cliente/pago o upload afectan interfaces fuera del repo. Usar:

- [Robin Admin README largo](https://github.com/RobinManuV/Robin-Admin/blob/main/READMELONG.md) y [USERGUIDE](https://github.com/RobinManuV/Robin-Admin/blob/main/USERGUIDE.md).
- [Robin Subscriptions README largo](https://github.com/saantimartinn/robin-subscriptions/blob/main/READMELONG.md) y [USERGUIDE](https://github.com/saantimartinn/robin-subscriptions/blob/main/USERGUIDE.md).

No existe release atómico ni package compartido: cambios deben mantener consumidores antiguos durante integración/deploy por etapas. La fuente de verdad de tablas y permisos pertenece al repo que posee ese entorno de datos.


## Cómo leer y modificar el WorkerCómo leer y modificar el Worker

Resuelve la ruta en el orden en que ejecuta el Worker: hostname, pathname, regla seleccionada, transformación de URL/método/headers/body y fetch del origin. Luego inspecciona cómo reescribe la respuesta (por ejemplo, HTML o referencias de assets) y qué pasa cuando ninguna regla coincide. No supongas que un route observado en la ficha del servicio y un route configurado en la zona sean el mismo dato.

El código versionado explica intención; [CLOUDFLARE_ROUTING.md](../CLOUDFLARE_ROUTING.md) registra el snapshot consultado en el dashboard y su discrepancia con la vista general de Routes. Si el dashboard cambia, actualiza fecha, alcance y observación concreta, no presentes una lectura anterior como live state.

Antes de cambiar un patrón, construye una tabla de path y destino para `/admin`, `/portal`, `/therobinplan`, `/login` y las rutas API. Comprueba UI con prefijo retenido, API con su eventual prefijo eliminado, query string y el fallback no gestionado. Coordina con las guías de [Admin](https://github.com/RobinManuV/Robin-Admin/blob/main/docs/userguide/06-cross-repository-flows.md) y [Subscriptions](https://github.com/saantimartinn/robin-subscriptions/blob/main/docs/userguide/06-cloudflare-cross-repo.md).

---

**USERGUIDE:** [Índice](../../USERGUIDE.md) · [← Anterior](./05-data-integrations-security.md) · [Siguiente documento de lectura →](./07-source-file-reference.md) · [READMELONG](../../READMELONG.md)
