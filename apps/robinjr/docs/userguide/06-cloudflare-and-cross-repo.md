# 06 · Rutas y flujos entre apps — Robin Jr

Project Robin reúne **Portal del Alumno, Robin Jr, Robin Community y Robin Admin** en este monorepo. `site/build.mjs` publica las cuatro apps en un sitio Netlify. Cada app conserva sus Functions y reglas de negocio; Community mantiene su dominio de datos de suscripción. Los contratos de identidad y API se revisan entre apps aunque compartan despliegue.

## Entrada pública

El [Worker vigente](../../../../infra/cloudflare/project-robin-router.js) pasa `/portal/*`, `/robinjr/*`, `/therobinplan/*`, `/admin/*`, `/login`, `/api/admin/*` y `/api/internal/*` al sitio unificado sin reescribir la ruta. Todo lo demás queda en la web pública. Algunas URL de webhooks firmados siguen temporalmente en sus receptores antiguos; consulta la [guía de enrutamiento](../CLOUDFLARE_ROUTING.md).

El [`netlify.toml` de raíz](../../../../netlify.toml) se genera desde `apps/*/netlify.toml` con `npm run site:config`. Las rutas de una app deben cambiarse en su propia configuración y verificarse después en el archivo generado. `npm run dev` desde la raíz sirve las cuatro apps en local.

## Identidad y datos

- El Portal del Alumno sirve identidad compartida. Admin usa `/portal/api/*` para las operaciones de sesión que pertenecen a Portal.
- Robin Jr sirve su experiencia en `/robinjr/*` y mantiene sus propias Functions.
- Robin Community sirve `/therobinplan/*` y crea una sesión de suscriptor propia tras validar la identidad de origen.
- Robin Admin sirve `/admin/*` y sus APIs CRM/operativas; las integraciones internas usan `/api/internal/*` con autenticación de backend.

Al cambiar un campo de `/api/me`, una cookie, un rol o una ruta, busca consumidores en las cuatro apps y comprueba tanto el redirect del sitio como la autorización de la Function. Un menú visible no concede acceso a un endpoint.

## Mentoría

La conversión de Mentoría abonada a General, Delft o Llegada se ejecuta **solo en el Portal del Alumno**. La cuota de 666,33 € queda como pago histórico y se acredita a la primera cuota del nuevo programa. Robin Jr y el CRM Admin no ofrecen esa acción. Véase [Mentoría y conversión](../../../portal/docs/MENTORIA_CONVERSION.md).

Para la topología del sitio consulta el [README de raíz](../../../../README.md) y la [guía del Worker](../../../../infra/cloudflare/README.md).

---

**USERGUIDE:** [Índice](../../USERGUIDE.md) · [← Anterior](./05-data-integrations-security.md) · [Siguiente →](./07-source-file-reference.md)
