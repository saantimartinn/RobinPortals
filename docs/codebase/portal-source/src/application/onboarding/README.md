# Frontend de onboarding

[← Subir un nivel](../README.md)

**Ruta real:** `portal-source/src/application/onboarding/`

Flujo guiado de incorporación del alumno.

**Entra aquí:** Cuando cambies pasos, formularios o navegación del onboarding.

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`OnboardingFlow.jsx`](../../../../../../portal-source/src/application/onboarding/OnboardingFlow.jsx) | Flujo completo de pantallas y formularios de onboarding. | `./origin.jsx`<br>`./dni.jsx`<br>`./contract.jsx`<br>`./payment.jsx`<br>`./profile.jsx` | Al cambiar esa parte de la experiencia React. |
| [`contract.jsx`](../../../../../../portal-source/src/application/onboarding/contract.jsx) | Módulo frontend de contract. | `../../theme.js`<br>`../../ui.jsx`<br>`../../api.js`<br>`./onboarding-shared.jsx`<br>`../../../../shared/contract-content.cjs`<br>`../../../../shared/financial-config.cjs` | Al cambiar esa parte de la experiencia React. |
| [`dni.jsx`](../../../../../../portal-source/src/application/onboarding/dni.jsx) | Módulo frontend de dni. | `../../theme.js`<br>`../../ui.jsx`<br>`../../api.js`<br>`./onboarding-shared.jsx` | Al cambiar esa parte de la experiencia React. |
| [`onboarding-shared.jsx`](../../../../../../portal-source/src/application/onboarding/onboarding-shared.jsx) | Módulo frontend de onboarding shared. | `../../assets/logo-r-blanco.png`<br>`../../theme.js` | Al cambiar esa parte de la experiencia React. |
| [`origin.jsx`](../../../../../../portal-source/src/application/onboarding/origin.jsx) | Módulo frontend de origin. | `../../theme.js`<br>`../../ui.jsx`<br>`../../api.js`<br>`./onboarding-shared.jsx` | Al cambiar esa parte de la experiencia React. |
| [`payment.jsx`](../../../../../../portal-source/src/application/onboarding/payment.jsx) | Módulo frontend de payment. | `../../theme.js`<br>`../../ui.jsx`<br>`../../client-utils.js`<br>`../../api.js`<br>`./onboarding-shared.jsx` | Al cambiar esa parte de la experiencia React. |
| [`profile.jsx`](../../../../../../portal-source/src/application/onboarding/profile.jsx) | Módulo frontend de profile. | `./questionnaire-fields.jsx`<br>`../../questionnaire-data.js`<br>`../../theme.js`<br>`../../../../shared/academic-systems.cjs`<br>`../../ui.jsx`<br>`../../api.js` | Al cambiar esa parte de la experiencia React. |
| [`questionnaire-fields.jsx`](../../../../../../portal-source/src/application/onboarding/questionnaire-fields.jsx) | Módulo frontend de questionnaire fields. | `../../questionnaire-data.js`<br>`../../theme.js` | Al cambiar esa parte de la experiencia React. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
