# 02 · Portal de suscriptor

## Shell y API

`frontend/src/application/SubscriberPortal.jsx` compone navegación/estado de suscripción y las vistas por feature. `frontend/src/api/index.js` define el cliente HTTP same-origin con JSON/form-data, cookies, manejo de status y exports de todas las funciones API. En `project-robin.com`, los `/api/*` se prefijan para obtener `/therobinplan/api/*`; la guía de [Cloudflare routing](../CLOUDFLARE_ROUTING.md) describe el proxy inverso.

## Features

| Grupo de `frontend/src/features/` | Responsabilidad y servicios principales |
|---|---|
| `subscription/` | Home, plan, payments, FAQs y support; checkout/portal/list plans y recibos. |
| `profile/` | Información y preferencias del suscriptor, persistidas con API profile. |
| `career/` | Empleo local, mentorías, CV AI, elección y generación/export del CV. |
| `services/` | Requests personales, residencia y disponibilidad/coming soon. |
| `levels/` | Progreso, beneficios, avisos de bloqueo y nivel. |
| `community/` | Partners, eventos, RSVP, retos, grupos, mensajes y social. |
| `admin/` | Users, discounts, partners/logos, mentors, events, challenges, FAQs, notifications y SQL/database console. |

`frontend/src/shared/` centraliza `utils.js` (roles y helpers), `constants.js`, tema, componentes, modals y controles UI. No mover reglas de acceso sensibles desde backend a shared frontend.

## Secuencia de cambio

Para una acción de UI identifica el handler en [API_INVENTORY](../API_INVENTORY.md), inspecciona su scope/ownership, actualiza cliente `frontend/src/api/index.js` y después el componente. Mantén loading/error, cancelación/debounce y refresh de perfil local. Si el dato se modifica, rastrea tabla y migración según [DATABASE_CURRENT](../DATABASE_CURRENT.md).
## Añadir una vista o acción

Empieza por el shell de `SubscriberPortal` y determina qué feature posee el estado. Mantén la operación remota en el API client y deja a la vista la presentación/estado específico; así se conserva un punto común para cookies, URL y normalización de errores.

Para una vista nueva confirma su montaje en la navegación del shell, la lectura inicial de datos, el estado vacío, la respuesta ante 401 y el refresh tras una mutación. Para formularios verifica validación de cliente como ayuda de UX, validación equivalente en backend, doble submit y mensajes cuando el proveedor falla.

La URL puede ser `/api/*` en desarrollo/directo o `/therobinplan/api/*` en el dominio compartido. El API client detecta host común y prefija las rutas `/api/`; no añadas un prefijo duplicado. Consulta el capítulo [06](06-cloudflare-cross-repo.md) si se modifica ese comportamiento.

---

**USERGUIDE:** [Índice](../../USERGUIDE.md) · [← Anterior](./01-app-session-and-sso.md) · [Siguiente documento de lectura →](./03-admin-and-community-features.md) · [READMELONG](../../READMELONG.md)
