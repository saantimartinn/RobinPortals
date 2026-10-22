# Pruebas automatizadas

[← Subir un nivel](../README.md)

**Ruta real:** `test/`

Regresiones unitarias y de límites arquitectónicos ejecutadas por Node.js.

**Entra aquí:** Cuando cambies comportamiento o quieras fijar un contrato antes de refactorizar.

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`academic-systems.test.cjs`](../../../test/academic-systems.test.cjs) | Pruebas automatizadas de academic systems.test. | `../shared/academic-systems.cjs` | Al fijar o actualizar el comportamiento cubierto. |
| [`account-access-email.test.js`](../../../test/account-access-email.test.js) | Pruebas automatizadas de account access email.test. | `../lib/account-access-email` | Al fijar o actualizar el comportamiento cubierto. |
| [`admin-dashboard-utils.test.cjs`](../../../test/admin-dashboard-utils.test.cjs) | Pruebas automatizadas de admin dashboard utils.test. | — | Al fijar o actualizar el comportamiento cubierto. |
| [`admin-navigation.test.mjs`](../../../test/admin-navigation.test.mjs) | Pruebas automatizadas de admin navigation.test. | `../portal-source/src/application/admin-navigation.js` | Al fijar o actualizar el comportamiento cubierto. |
| [`admins.test.js`](../../../test/admins.test.js) | Pruebas automatizadas de admins.test. | `../lib/admins` | Al fijar o actualizar el comportamiento cubierto. |
| [`auth-session.test.js`](../../../test/auth-session.test.js) | Pruebas automatizadas de auth session.test. | `../lib/auth` | Al fijar o actualizar el comportamiento cubierto. |
| [`authorization.test.js`](../../../test/authorization.test.js) | Pruebas automatizadas de authorization.test. | `../lib/authorization` | Al fijar o actualizar el comportamiento cubierto. |
| [`backend-boundaries.test.js`](../../../test/backend-boundaries.test.js) | Pruebas automatizadas de backend boundaries.test. | `../lib/admin-dashboard`<br>`../lib/career-suggestions`<br>`../lib/notion` | Al fijar o actualizar el comportamiento cubierto. |
| [`birthday-notifications.test.js`](../../../test/birthday-notifications.test.js) | Pruebas automatizadas de birthday notifications.test. | `../netlify/functions/birthday-notifications` | Al fijar o actualizar el comportamiento cubierto. |
| [`booking-availability.test.js`](../../../test/booking-availability.test.js) | Pruebas automatizadas de booking availability.test. | `../lib/booking-availability` | Al fijar o actualizar el comportamiento cubierto. |
| [`booking-config.test.js`](../../../test/booking-config.test.js) | Pruebas automatizadas de booking config.test. | `../lib/booking-config` | Al fijar o actualizar el comportamiento cubierto. |
| [`booking-persistence.test.js`](../../../test/booking-persistence.test.js) | Pruebas automatizadas de booking persistence.test. | `../netlify/functions/bookings-create` | Al fijar o actualizar el comportamiento cubierto. |
| [`career-documents.test.js`](../../../test/career-documents.test.js) | Pruebas automatizadas de career documents.test. | `../lib/career-documents` | Al fijar o actualizar el comportamiento cubierto. |
| [`career-feedback.test.js`](../../../test/career-feedback.test.js) | Pruebas automatizadas de career feedback.test. | `../lib/career-suggestions` | Al fijar o actualizar el comportamiento cubierto. |
| [`career-requirements.test.js`](../../../test/career-requirements.test.js) | Pruebas automatizadas de career requirements.test. | `../lib/career-requirements` | Al fijar o actualizar el comportamiento cubierto. |
| [`careers.test.js`](../../../test/careers.test.js) | Pruebas automatizadas de careers.test. | `../netlify/functions/careers-list` | Al fijar o actualizar el comportamiento cubierto. |
| [`contract-content.test.js`](../../../test/contract-content.test.js) | Pruebas automatizadas de contract content.test. | `../shared/contract-content.cjs`<br>`../shared/financial-config.cjs` | Al fijar o actualizar el comportamiento cubierto. |
| [`dni-upload.test.js`](../../../test/dni-upload.test.js) | Pruebas automatizadas de dni upload.test. | `../lib/dni-upload` | Al fijar o actualizar el comportamiento cubierto. |
| [`document-drive.test.js`](../../../test/document-drive.test.js) | Pruebas automatizadas de document drive.test. | `../lib/document-drive` | Al fijar o actualizar el comportamiento cubierto. |
| [`faq-knowledge.test.js`](../../../test/faq-knowledge.test.js) | Pruebas automatizadas de faq knowledge.test. | `../lib/faq-knowledge`<br>`../lib/faq-citations` | Al fijar o actualizar el comportamiento cubierto. |
| [`financial-config.test.js`](../../../test/financial-config.test.js) | Pruebas automatizadas de financial config.test. | `../shared/financial-config.cjs`<br>`../lib/payments`<br>`../lib/holded`<br>`../shared/contract-content.cjs` | Al fijar o actualizar el comportamiento cubierto. |
| [`frontend-domain.test.mjs`](../../../test/frontend-domain.test.mjs) | Pruebas automatizadas de frontend domain.test. | `../portal-source/src/api.js`<br>`../portal-source/src/application/documents/document-utils.js`<br>`../portal-source/src/session.js` | Al fijar o actualizar el comportamiento cubierto. |
| [`google-sheets.test.js`](../../../test/google-sheets.test.js) | Pruebas automatizadas de google sheets.test. | `../lib/google-sheets` | Al fijar o actualizar el comportamiento cubierto. |
| [`holded.test.js`](../../../test/holded.test.js) | Pruebas automatizadas de holded.test. | `../lib/holded`<br>`../shared/financial-config.cjs` | Al fijar o actualizar el comportamiento cubierto. |
| [`identity.test.js`](../../../test/identity.test.js) | Pruebas automatizadas de identity.test. | `../lib/identity` | Al fijar o actualizar el comportamiento cubierto. |
| [`integration-sync.test.js`](../../../test/integration-sync.test.js) | Pruebas automatizadas de integration sync.test. | `../lib/integration-sync`<br>`../netlify/functions/integration-retry` | Al fijar o actualizar el comportamiento cubierto. |
| [`observability.test.js`](../../../test/observability.test.js) | Pruebas automatizadas de observability.test. | `../lib/observability` | Al fijar o actualizar el comportamiento cubierto. |
| [`operational-config.test.js`](../../../test/operational-config.test.js) | Pruebas automatizadas de operational config.test. | `../lib/operational-config` | Al fijar o actualizar el comportamiento cubierto. |
| [`password-policy.test.cjs`](../../../test/password-policy.test.cjs) | Pruebas automatizadas de password policy.test. | `../shared/password-policy.cjs` | Al fijar o actualizar el comportamiento cubierto. |
| [`privacy.test.js`](../../../test/privacy.test.js) | Pruebas automatizadas de privacy.test. | `../lib/privacy` | Al fijar o actualizar el comportamiento cubierto. |
| [`profile-avatar.test.js`](../../../test/profile-avatar.test.js) | Pruebas automatizadas de profile avatar.test. | `../netlify/functions/profile-avatar` | Al fijar o actualizar el comportamiento cubierto. |
| [`rate-limit-config.test.mjs`](../../../test/rate-limit-config.test.mjs) | Pruebas automatizadas de rate limit config.test. | `../netlify/edge-functions/rate-limit-identity.mjs`<br>`../netlify/edge-functions/rate-limit-expensive.mjs` | Al fijar o actualizar el comportamiento cubierto. |
| [`revolut.test.js`](../../../test/revolut.test.js) | Pruebas automatizadas de revolut.test. | `../lib/revolut` | Al fijar o actualizar el comportamiento cubierto. |
| [`sandbox-mode.test.js`](../../../test/sandbox-mode.test.js) | Pruebas automatizadas de sandbox mode.test. | `../lib/sandbox-mode` | Al fijar o actualizar el comportamiento cubierto. |
| [`security-headers.test.js`](../../../test/security-headers.test.js) | Pruebas automatizadas de security headers.test. | `../lib/http` | Al fijar o actualizar el comportamiento cubierto. |
| [`storage.test.js`](../../../test/storage.test.js) | Pruebas automatizadas de storage.test. | `../lib/storage` | Al fijar o actualizar el comportamiento cubierto. |
| [`student-phone.test.js`](../../../test/student-phone.test.js) | Pruebas automatizadas de student phone.test. | `../lib/student-phone` | Al fijar o actualizar el comportamiento cubierto. |
| [`validation.test.js`](../../../test/validation.test.js) | Pruebas automatizadas de validation.test. | `../lib/validation` | Al fijar o actualizar el comportamiento cubierto. |
| [`webhook-auth.test.js`](../../../test/webhook-auth.test.js) | Pruebas automatizadas de webhook auth.test. | `../lib/http`<br>`../netlify/functions/meet-transcript-poll` | Al fijar o actualizar el comportamiento cubierto. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
