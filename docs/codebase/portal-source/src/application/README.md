# Experiencia de aplicación

[← Subir un nivel](../README.md)

**Ruta real:** `portal-source/src/application/`

Pantallas principales de alumnos y administración, organizadas por dominio.

**Entra aquí:** Cuando cambies una sección funcional del portal autenticado.

## Subcarpetas

| Carpeta | Qué contiene | Entra aquí cuando |
|---|---|---|
| [`admin/`](admin/README.md) | Contenido mantenido de `portal-source/src/application/admin/`. | Cuando necesites trabajar en esta parte concreta del repositorio. |
| [`careers/`](careers/README.md) | Contenido mantenido de `portal-source/src/application/careers/`. | Cuando necesites trabajar en esta parte concreta del repositorio. |
| [`documents/`](documents/README.md) | Reglas de presentación y estado de documentos. | Cuando cambies fases, documentos por defecto o etiquetas de estado. |
| [`onboarding/`](onboarding/README.md) | Flujo guiado de incorporación del alumno. | Cuando cambies pasos, formularios o navegación del onboarding. |
| [`payments/`](payments/README.md) | Presentación de pagos, facturas y justificantes. | Cuando cambies formato o experiencia visual de pagos. |

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`AdminChatIA.jsx`](../../../../../portal-source/src/application/AdminChatIA.jsx) | Módulo frontend de AdminChatIA. | `../theme.js`<br>`../ui.jsx`<br>`../client-utils.js`<br>`../api.js` | Al cambiar esa parte de la experiencia React. |
| [`AdminPortal.jsx`](../../../../../portal-source/src/application/AdminPortal.jsx) | Composición principal del portal de administración. | `./AdminWorkspace.jsx`<br>`./Faqs.jsx`<br>`./admin/AdminChatAssistant.jsx`<br>`./admin/ClientAvatar.jsx`<br>`./admin/useDebounced.js`<br>`./admin/dashboard.jsx` | Al cambiar esa parte de la experiencia React. |
| [`AdminWorkspace.jsx`](../../../../../portal-source/src/application/AdminWorkspace.jsx) | Módulo frontend de AdminWorkspace. | `../application-steps.js` | Al cambiar esa parte de la experiencia React. |
| [`ApplicationPortals.jsx`](../../../../../portal-source/src/application/ApplicationPortals.jsx) | Superficies principales de la experiencia del alumno. | `./PortalAssistant.jsx`<br>`./StudentStatus.jsx`<br>`./StudentProfile.jsx`<br>`./BookingsPortal.jsx`<br>`../assets/robin-keys.webp`<br>`../assets/robin-wordmark.png` | Al cambiar esa parte de la experiencia React. |
| [`BookingsPortal.jsx`](../../../../../portal-source/src/application/BookingsPortal.jsx) | Módulo frontend de BookingsPortal. | `../theme.js`<br>`../ui.jsx`<br>`../api.js` | Al cambiar esa parte de la experiencia React. |
| [`ClientSections.jsx`](../../../../../portal-source/src/application/ClientSections.jsx) | Secciones de pagos, carreras y documentos del alumno. | `../ui.jsx`<br>`../theme.js`<br>`./payments/payment-utils.jsx`<br>`./documents/document-utils.js`<br>`./payments/InvoiceReceipt.jsx`<br>`./careers/CareerRequirementsTimeline.jsx` | Al cambiar esa parte de la experiencia React. |
| [`CrossPortalNav.jsx`](../../../../../portal-source/src/application/CrossPortalNav.jsx) | Módulo frontend de CrossPortalNav. | `../assets/robin-wordmark.png`<br>`../session.js`<br>`../admin-permissions.js` | Al cambiar esa parte de la experiencia React. |
| [`DeveloperClientsTable.jsx`](../../../../../portal-source/src/application/DeveloperClientsTable.jsx) | Módulo frontend de DeveloperClientsTable. | `../api.js` | Al cambiar esa parte de la experiencia React. |
| [`Faqs.jsx`](../../../../../portal-source/src/application/Faqs.jsx) | Módulo frontend de Faqs. | `../api.js`<br>`../ui.jsx` | Al cambiar esa parte de la experiencia React. |
| [`PortalAssistant.jsx`](../../../../../portal-source/src/application/PortalAssistant.jsx) | Módulo frontend de PortalAssistant. | `../theme.js`<br>`../client-utils.js`<br>`../api.js` | Al cambiar esa parte de la experiencia React. |
| [`StudentProfile.jsx`](../../../../../portal-source/src/application/StudentProfile.jsx) | Módulo frontend de StudentProfile. | `../theme.js`<br>`../ui.jsx`<br>`../client-utils.js`<br>`../api.js` | Al cambiar esa parte de la experiencia React. |
| [`StudentStatus.jsx`](../../../../../portal-source/src/application/StudentStatus.jsx) | Módulo frontend de StudentStatus. | `../application-steps.js`<br>`../theme.js`<br>`../ui.jsx` | Al cambiar esa parte de la experiencia React. |
| [`admin-navigation.js`](../../../../../portal-source/src/application/admin-navigation.js) | Módulo frontend de admin navigation. | — | Al cambiar esa parte de la experiencia React. |
| [`admin-portal.css`](../../../../../portal-source/src/application/admin-portal.css) | Módulo frontend de admin portal. | — | Al cambiar esa parte de la experiencia React. |
| [`cross-portal-nav.css`](../../../../../portal-source/src/application/cross-portal-nav.css) | Módulo frontend de cross portal nav. | — | Al cambiar esa parte de la experiencia React. |
| [`developer-clients-table.css`](../../../../../portal-source/src/application/developer-clients-table.css) | Módulo frontend de developer clients table. | — | Al cambiar esa parte de la experiencia React. |
| [`student-portal.css`](../../../../../portal-source/src/application/student-portal.css) | Módulo frontend de student portal. | — | Al cambiar esa parte de la experiencia React. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
