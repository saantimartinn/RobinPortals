# Operaciones

GitHub es la fuente de versiones y Netlify despliega los commits. Los cambios de código no
deben hacerse únicamente en el editor de Netlify: se implementan en una rama, pasan CI,
se revisan y después se despliegan desde el repositorio.

## Preparación y gates

Requisitos: Node.js 20 o posterior. Instalar con los lockfiles:

```bash
npm ci
npm --prefix portal-source ci --include=dev
```

Antes de publicar, ejecutar:

```bash
node scripts/generate-api-inventory.js
node scripts/generate-component-map.js
node scripts/generate-file-map.js
node scripts/check-syntax.js
node scripts/check-function-boundaries.js
node scripts/lint.js
node scripts/check-frontend-bindings.js
node scripts/check-empty-catches.js
node scripts/check-env-example.js
node scripts/check-pii-logs.js
node scripts/check-platform-scope.js
node --test test/*.test.js test/*.test.mjs test/*.test.cjs
npm --prefix portal-source run build
```

Las pruebas usan fakes y no deben contactar Supabase ni ningún proveedor de producción.
CI repite estos gates y comprueba que los tres inventarios generados estén actualizados.

## Despliegue

1. Revisar el diff, especialmente rutas, autorización, variables y migraciones.
2. Hacer commit y push de la rama; abrir/actualizar el pull request.
3. Exigir CI verde antes de integrar en `main`.
4. Netlify instala y construye el frontend, publica `deploy/portal` y empaqueta Functions.
5. Revisar el deploy log; después ejecutar los checks de producción siguientes.

Checklist posterior:

- `/` redirige a `/portal/` y el frontend carga sin errores de consola;
- login/logout y `/api/me` funcionan para un usuario de prueba autorizado;
- respuestas `/api/*` incluyen `Cache-Control: no-store` y los headers globales esperados;
- una ráfaga controlada confirma que las dos Edge Functions limitan los grupos definidos;
- webhooks y schedules aparecen activos en Netlify;
- un recurso de imagen externo permitido, checkout y enlace firmado funcionan cuando el
  cambio afecta a CSP, Revolut o Storage;
- logs no muestran secretos, contraseñas, documentos ni payloads personales completos.

## Base de datos

[DATABASE_CURRENT.md](DATABASE_CURRENT.md) es un snapshot estructural histórico, no una
migración. Ningún cambio de código autoriza modificar producción. Toda evolución de schema
necesita SQL versionado, revisión independiente, backup/plan de rollback y validación de
RLS/consumidores. No ejecutar `db push`, migraciones o comandos destructivos como parte de
los gates normales.

## Rollback

- **Solo código/configuración:** revertir el commit causante en GitHub y redesplegar el
  commit anterior en Netlify. Confirmar luego el checklist mínimo.
- **Variable/secret:** restaurar el valor anterior en Netlify, redesplegar y revocar solo
  cuando el nuevo valor se haya validado.
- **Proveedor/webhook:** desactivar la nueva entrega en el proveedor y volver a la URL o
  secreto anterior; reconciliar eventos no procesados por ID.
- **Base de datos:** seguir el rollback escrito para esa migración. Un rollback de Netlify
  no revierte datos ni schema.

## Diagnóstico

1. Localizar `request_id`, operación y código estable en los logs de Netlify.
2. Separar errores de entrada/autorización, datos, proveedor y despliegue.
3. Para Sheets/Holded revisar pendientes/fallidos de `integration_retry`; no reenviar email
   a ciegas.
4. Para Revolut comparar order/payment IDs y estado persistido antes de repetir.
5. Para Meet/Drive usar los health endpoints administrativos y comprobar scopes/tokens.
6. Si el frontend falla tras deploy, revisar primero assets, base `/portal/`, CSP y build log.

Referencias: [ENVIRONMENT.md](ENVIRONMENT.md), [INTEGRATIONS.md](INTEGRATIONS.md),
[OBSERVABILITY.md](OBSERVABILITY.md), [BROWSER_SECURITY.md](BROWSER_SECURITY.md),
[ABUSE_PROTECTION.md](ABUSE_PROTECTION.md) y [TESTING.md](TESTING.md).
