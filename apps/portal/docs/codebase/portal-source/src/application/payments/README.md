# Frontend de pagos

[← Subir un nivel](../README.md)

**Ruta real:** `portal-source/src/application/payments/`

Presentación de pagos, facturas y justificantes.

**Entra aquí:** Cuando cambies formato o experiencia visual de pagos.

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`InvoiceReceipt.jsx`](../../../../../../portal-source/src/application/payments/InvoiceReceipt.jsx) | Justificante de pago preparado para impresión. | `../../../../shared/financial-config.cjs`<br>`../../ui.jsx`<br>`./payment-utils.jsx` | Al cambiar esa parte de la experiencia React. |
| [`payment-utils.jsx`](../../../../../../portal-source/src/application/payments/payment-utils.jsx) | Módulo frontend de payment utils. | `../../ui.jsx` | Al cambiar esa parte de la experiencia React. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
