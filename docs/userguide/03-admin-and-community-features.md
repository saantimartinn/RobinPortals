# 03 · Admin, comunidad y carrera

## Admin de suscripciones

El root `frontend/src/app.jsx` presenta `SubscriberAdmin.jsx` solo tras validar principal local y scope del admin de aplicación. `frontend/src/features/admin/` descompone listas, detalle de usuario, FAQs, partner logo, mentors, discounts, events, challenges, notices y base de datos del producto. `backend/functions/sub-admin-data.js`, `sub-admin-mutate.js`, `sub-admin-database.js` y `partner-logo-upload.js` forman la frontera de escritura/consulta.

`backend/lib/application-permissions.js` define tablas/acciones por capabilities. Los handlers de admin deben validar role y allowlist tanto de entidad como de campo/acción; la UI de SQL nunca es una autorización en sí.

## Comunidad

- `SubCommunity.jsx` organiza overview, groups, events, offers, associations, trips y profile cards.
- `SubSocial.jsx`, `SubMessageThread.jsx` y archivos de `community/` consultan/mutan social, mensajes, partners, RSVP y retos.
- API handlers asociados: `social.js`, `messages.js`, `challenges.js`, `partners-list.js`, `community-events-list.js`, `community-rsvp.js` y notification Functions.
- `backend/lib/social.js` / `application-permissions.js` contienen reglas reutilizables; comprobar ownership de mensajes, eventos y contenido.

## Carrera y servicios

- `features/career/`: perfil profesional, empleos, CV assistance con Anthropic, exports docx/html y mentorías.
- `features/services/`: solicitudes de residencia/servicio y datos de perfil local.
- `features/subscription/`: estado de plan y cobro Stripe.
- `features/levels/`: beneficios y progreso.

El contrato de IA y tratamiento de datos se describe en [AI_DATA_USE](../AI_DATA_USE.md); integraciones backend y variables en [INTEGRATIONS](../INTEGRATIONS.md) y [ENVIRONMENT](../ENVIRONMENT.md).


## Ownership y permisos de featuresOwnership y permisos de features

Admin de Subscriptions administra entidades locales del producto. Community trabaja sobre cuentas, relaciones, mensajes, eventos y retos. Que ambos usen el mismo principal local no elimina las comprobaciones por entidad, acción y ownership.

Al añadir una mutación administrativa inspecciona `backend/lib/application-permissions.js` y el handler correspondiente; limita nombres de entidad/acción/campo y valida el ID afectado. La UI no es una frontera de autorización. Para mensajes/RSVP/social valida quién puede leer o actuar sobre el registro; para contenido compartido revisa qué usuarios reciben una notificación.

Al tocar una feature que usa varios endpoints, deja claro qué datos son de perfil, suscripción o comunidad y qué API es responsable. Comprueba loading/error/empty en cada panel y que después de guardar se actualizan tanto el estado local como cualquier resumen derivado.

---

**USERGUIDE:** [Índice](../../USERGUIDE.md) · [← Anterior](./02-subscriber-frontend.md) · [Siguiente documento de lectura →](./04-api-and-backend.md) · [READMELONG](../../READMELONG.md)
