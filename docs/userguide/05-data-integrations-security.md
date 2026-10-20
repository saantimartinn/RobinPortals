# 05 · Base de datos, integraciones y seguridad

## Supabase

`lib/supabase.js` construye clientes server con service-role key. `supabase/migrations/` y `supabase/*` mantienen SQL de origen; snapshots de `docs/DATABASE_CURRENT.md` documentan estructura conocida. El backend filtra acceso en cada Function; RLS y contratos deben confirmarse contra entorno de destino antes de migrar. Frontend solo recibe datos permitidos o signed URLs temporales.

## Proveedores

| Proveedor | Adaptadores representativos | Flujos |
|---|---|---|
| Revolut | `lib/revolut.js`, `payment-provider.js`, `payment-attempts.js` | checkout, webhooks firmados y reconciliación de pagos de aplicación. |
| Google | `google-drive.js`, `google-sheets.js`, `google-calendar.js`, `meet-transcript.js` | documentos, calendario, reservas, transcripciones y métricas. |
| Holded | `lib/holded.js` y helpers | facturación/integración administrativa. |
| Notion | `lib/notion.js` | ingestión de CRM, webhook y sync. |
| Anthropic | `lib/anthropic-chat.js` | asistente y sugerencias con guardrails de entrada y payload. |
| Resend/Gmail | `lib/email.js`, `lib/google-gmail.js` | correo operacional o campañas soportadas. |
| Netlify schedules | `netlify.toml` + Functions | retries, Meet poll, cleanups y tareas operativas. |

## Controles

- Secretos solo en entorno servidor, no en `VITE_*`, assets ni errores públicos. Ver [ENVIRONMENT](../ENVIRONMENT.md).
- Sesión firmada, roles y permisos se verifican en backend. Ver [AUTHORIZATION](../AUTHORIZATION.md), [IDENTITY_MODEL](../IDENTITY_MODEL.md).
- Webhooks validan firma/secreto y conservan idempotencia; pagos se reconcilian por IDs. Ver [INTEGRATIONS](../INTEGRATIONS.md).
- Subidas usan ticket para un path/MIME/size concreto; acceso a storage queda en manos de backend.
- Logger y guards redaccionan PII; no añadir body completo o nombres de usuario en CI. Ver [PRIVACY_DATA_MAP](../PRIVACY_DATA_MAP.md), [OBSERVABILITY](../OBSERVABILITY.md).
- Edge rate limiting no reemplaza rate limit/idempotencia del proveedor ni auth del handler.

## Calidad y cambios de datos

Los workflows y `scripts/` exigen inventarios, sintaxis, límites de funciones, detección de PII/empty catches y pruebas. Una migración no es equivalente a un cambio de código y puede afectar la base fuera del deploy; seguir backup, ownership, RLS y rollback de [OPERATIONS](../OPERATIONS.md).
