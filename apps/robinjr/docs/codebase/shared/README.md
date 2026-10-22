# Reglas compartidas entre runtimes

[← Subir un nivel](../README.md)

**Ruta real:** `shared/`

Configuración de dominio consumida tanto por Node.js como por el frontend.

**Entra aquí:** Cuando backend y frontend deban aplicar exactamente la misma regla.

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`academic-systems.cjs`](../../../shared/academic-systems.cjs) | Regla de dominio compartida para academic systems. | — | Al cambiar una regla que debe coincidir entre runtimes. |
| [`application-roles.cjs`](../../../shared/application-roles.cjs) | Regla canónica que hace equivalentes los roles `admin` y `supervisor`. | — | Al cambiar una regla que debe coincidir entre runtimes. |
| [`contract-content.cjs`](../../../shared/contract-content.cjs) | Contenido contractual compartido por pantalla y PDF. | `./financial-config.cjs` | Al cambiar una regla que debe coincidir entre runtimes. |
| [`financial-config.cjs`](../../../shared/financial-config.cjs) | Importes, fiscalidad y cálculo de cuotas de aplicación. | — | Al cambiar una regla que debe coincidir entre runtimes. |
| [`password-policy.cjs`](../../../shared/password-policy.cjs) | Política de contraseñas compartida por backend y frontend. | — | Al cambiar una regla que debe coincidir entre runtimes. |
| [`portal-faqs.json`](../../../shared/portal-faqs.json) | Regla de dominio compartida para portal faqs. | — | Al cambiar una regla que debe coincidir entre runtimes. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
