# 04 · API y backend

## Rutas

`netlify.toml` enlaza `/api/*` con `backend/functions/*.js`; el frontend invoca la misma API por `frontend/src/api/index.js`. [API_INVENTORY](../API_INVENTORY.md) mapea endpoint a handler. Algunas reglas se escriben desde plugin Vite a `dist/_redirects` (developer DB); inspeccionar output generado al modificar.

Familias de handlers:

- auth/session: `auth-login`, `auth-logout`, `auth-change-password`, `auth-sso`, `me`, `subscriber-signup`;
- planes y cobro: `subscription-plans`, `subscription-checkout`, `subscription-portal`, `discount-validate`, `stripe-webhook`;
- dominio subscriber: `subscriber-profile-update`, `subscriber-cv-ai`, `service-requests`;
- comunidad: `social`, `messages`, `challenges`, partner list, community event/RSVP;
- admin/notifications: `sub-admin-*`, `partner-logo-upload`, `notifications-*`, FAQs.

## Backend libs

| Archivo | Dominio |
|---|---|
| `backend/lib/http.js` | CORS/origin, parseo y respuestas HTTP. |
| `backend/lib/auth.js`, `principal.js` | JWT/cookie, current principal, canonicalización de roles y display. |
| `backend/lib/supabase.js` | Clientes al DB del Plan y conexión de origen Platform separada. |
| `backend/lib/subscription.js`, `subscription-billing.js`, `stripe.js`, `discounts.js` | Estado del plan, Stripe checkout/portal/webhook y reglas discount. |
| `backend/lib/application-permissions.js` | Alcance permitido a admin sobre tablas/acciones. |
| `backend/lib/social.js` | Operaciones social con ownership/permisos. |
| `backend/lib/email.js`, `anthropic-chat.js` | Adaptadores Resend/Anthropic. |
| `backend/lib/partner-logo.js` | Normalización/validación y storage de logos. |
| Otros `backend/lib/*` | Operaciones específicas del service, perfil, reset password y DB utility enlazadas en file map. |

## Requisitos de cada handler

Debe ser visible qué métodos acepta, qué datos lee y modifica, su nivel auth, alcance por record/table, manejo de errores y efectos externos. Webhooks verifican firma/secreto antes de mutation; retries requieren idempotencia; `Cache-Control: no-store` aplica a API. No añadir secrets o body sensible al log.

Leer fuente: [inventario API](../API_INVENTORY.md) → [contratos](../API_CONTRACTS.md) → handler → `backend/lib` → migration/table.


## Implementar una ruta nuevaImplementar una ruta nueva

Empieza por `netlify.toml`: verifica redirect exacto, orden y target `/.netlify/functions/<name>`. Luego crea el handler en `backend/functions/` y limita su responsabilidad a protocolo: método, origen, sesión, autorización, parsing/validación y status. Para lógica de negocio reutilizable crea o actualiza un módulo `backend/lib/`.

Antes de aceptar una escritura responde: ¿quién es el principal?, ¿qué scope/rol se exige?, ¿qué recurso puede mutar?, ¿qué campos acepta el servidor?, ¿qué ocurre en reintento?, ¿qué respuesta necesita la UI? En un webhook agrega verificación de firma y clave de deduplicación antes de actualizar estado.

El catálogo [API_INVENTORY](../API_INVENTORY.md) ayuda a encontrar el handler pero no describe todos los errores ni todas las ramas condicionales. Lee la Function, el módulo backend y las migraciones. Comprueba el API client para no introducir inconsistencia entre path, método y payload.

---

**USERGUIDE:** [Índice](../../USERGUIDE.md) · [← Anterior](./03-admin-and-community-features.md) · [Siguiente documento de lectura →](./05-data-security-and-operations.md) · [READMELONG](../../READMELONG.md)
