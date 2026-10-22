# Integraciones externas

Todas las credenciales viven en el entorno de Netlify y solo se consumen desde backend.
`.env.example` es el inventario canónico de nombres; no contiene valores. Una integración
opcional ausente debe fallar de forma explícita o quedar registrada, nunca simular éxito.

| Proveedor | Uso | Configuración principal | Autoridad/idempotencia | Fallo y recuperación |
|---|---|---|---|---|
| Supabase | Tablas y Storage privado | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, buckets opcionales | Backend con service role; navegador limitado a tickets firmados por objeto; IDs/constraints de negocio | Error crítico de datos; no hay fallback local |
| Revolut | Checkout alojado y cobros de aplicación | Credenciales Merchant y secreto del webhook | Firma de webhook; `payment_attempts` correlaciona órdenes; cumplimiento idempotente | Reentrega del proveedor; la escritura financiera principal aborta ante error |
| Google Drive | Carpetas y documentos de alumnos | OAuth compartido, refresh token, carpeta raíz | Nombres/rutas deterministas; resultado registrado | Best-effort en copias secundarias; health/sync admin para diagnóstico |
| Google Sheets | Sincronización operativa de alumnos | OAuth, refresh token; por defecto workbook `1fAzgWD-xmhbupFCKDx-wpBQG5wBJT9uv3MRScZ_EiRY`, pestaña `2041257143` | Upsert por PR del alumno | Cola `integration_retry`, cada 10 min, máximo 5 intentos |
| Google Calendar/Meet | Disponibilidad, evento y transcripción | OAuth + refresh token por advisor; secreto Meet | Event ID y `processed_meet_docs` evitan duplicados | Calendar es crítico al reservar; polling/webhook de Meet quedan observables |
| Holded | Factura asociada a un pago | PAT y cuentas por producto | Operación por `payment_id` | Cola `integration_retry`, cada 10 min, máximo 5 intentos |
| Resend | Emails transaccionales y avisos | API key, remitente, inboxes operativos | Sin clave de idempotencia de entrega | Best-effort y log; no se reintenta automáticamente para evitar duplicados |
| Anthropic | Chat, OCR, CV y briefings | API key y modelo opcional | Petición delimitada por endpoint | Crítico si la respuesta IA es el producto; opcional para briefings auxiliares |
| Notion | Ingesta/bootstrap de usuarios | verification token o webhook secret, mapa y contraseña bootstrap | Secreto/token de entrada y lead/user existente | Rechazo fail-closed; revisar `webhook_log` |

## Contrato de datos por proveedor

| Proveedor | Entradas | Salidas | Entrada webhook/job | Retry | Fuente de verdad |
|---|---|---|---|---|---|
| Supabase | IDs, metadata, binarios directos con ticket y mutaciones validadas | filas, objetos privados, URLs firmadas | No aplica | Error al llamante; sin réplica local | Tablas de negocio y Storage |
| Revolut | cliente, cuota e importe backend | URL alojada y IDs de orden/pago | `/api/revolut/webhook`, firma del proveedor | Reentrega + verificación al volver al portal | `payments`; `payment_attempts` correlaciona Revolut |
| Drive | identidad y binario/documento | folder/file IDs y rutas | Jobs admin/Meet internos | Manual/best-effort según flujo | Metadata DB; Drive conserva copia binaria auxiliar |
| Sheets | `user_id` y read model calculado | fila operativa upsert | `integration-retry` cada 10 min | Hasta 5 intentos | Tablas ROBIN, nunca la hoja |
| Calendar/Meet | advisor, slot, asistentes/transcripción | evento, Meet URL/código, texto | webhook secreto + poll cada 15 min | Provider/poll; idempotencia de documento | `bookings` e historial del usuario |
| Holded | `payment_id` pagado | documento fiscal remoto | `integration-retry` cada 10 min | Hasta 5 intentos | `payments`; Holded es destino fiscal |
| Resend | destinatario y plantilla mínima | estado de entrega | No | No automático, evita duplicados | Evento de negocio; email es notificación |
| Anthropic | contexto minimizado por caso | texto/JSON sugerido | No | Error visible o fallback explícito | Datos ROBIN; salida IA no sustituye el expediente |
| Notion | lead, estado, responsable y producto | alta/actualización de `users` | webhook HMAC/secreto | Reentrega externa; idempotencia por `lead_id` | `users` tras aceptar el evento |

## Fronteras de consistencia

La escritura en las tablas de negocio es la fuente de verdad. Sheets, Holded, Drive y
email son side effects; nunca deben convertir un fallo externo en un cobro o contrato
ficticio. Calendar es la excepción en reservas: si no se puede crear el evento, no se
confirma el booking.

Los reintentos permitidos se guardan en `webhook_log` con `source=integration_retry`.
El job programado procesa hasta 20 pendientes por ejecución y solo despacha las dos
operaciones allowlisted `google_sheets/upsert_client` y `holded/invoice_payment`. No hay
claim/lock transaccional; la posible concurrencia se tolera porque ambos destinos deben
ser idempotentes.

## Webhooks y tareas programadas

- Revolut verifica `Revolut-Request-Timestamp` y `Revolut-Signature` con una tolerancia
  de cinco minutos. Los eventos `ORDER_COMPLETED` recuperan de nuevo la orden antes
  de cumplir el pago. Un cobro Sandbox queda marcado como simulado y no factura en Holded.
- Meet y Notion requieren sus secretos configurados; no aceptan una sesión de usuario.
- `meet-transcript-poll`, `chat-cleanup` e `integration-retry` solo aceptan invocación con
  forma de evento programado y no exponen una tarea administrativa pública.

Tras un despliegue, confirmar schedules, entregas de webhook y logs de proveedor en
Netlify. Los códigos y metadatos permitidos para observabilidad están definidos en
[OBSERVABILITY.md](OBSERVABILITY.md); no registrar payloads completos con PII.

## Rotación y retirada

Rotar una credencial en Netlify, desplegar y comprobar un flujo mínimo antes de revocar la
anterior en el proveedor. Para retirar una integración: confirmar ausencia de consumidores
internos, schedules/webhooks externos y datos pendientes; eliminar después código,
variables y documentación en el mismo cambio.
