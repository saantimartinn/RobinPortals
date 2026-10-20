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
