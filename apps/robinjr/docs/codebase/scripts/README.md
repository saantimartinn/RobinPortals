# Scripts de calidad y documentación

[← Subir un nivel](../README.md)

**Ruta real:** `scripts/`

Gates estáticos y generadores ejecutados localmente y en CI.

**Entra aquí:** Cuando cambies una regla de calidad o un inventario generado.

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`check-codebase-docs.js`](../../../scripts/check-codebase-docs.js) | Gate o generador de CI para check codebase docs. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`check-empty-catches.js`](../../../scripts/check-empty-catches.js) | Gate o generador de CI para check empty catches. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`check-env-example.js`](../../../scripts/check-env-example.js) | Gate o generador de CI para check env example. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`check-frontend-bindings.js`](../../../scripts/check-frontend-bindings.js) | Gate o generador de CI para check frontend bindings. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`check-function-boundaries.js`](../../../scripts/check-function-boundaries.js) | Gate o generador de CI para check function boundaries. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`check-pii-logs.js`](../../../scripts/check-pii-logs.js) | Gate o generador de CI para check pii logs. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`check-platform-scope.js`](../../../scripts/check-platform-scope.js) | Gate o generador de CI para check platform scope. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`check-syntax.js`](../../../scripts/check-syntax.js) | Gate o generador de CI para check syntax. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`generate-api-inventory.js`](../../../scripts/generate-api-inventory.js) | Gate o generador de CI para generate api inventory. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`generate-codebase-docs.js`](../../../scripts/generate-codebase-docs.js) | Gate o generador de CI para generate codebase docs. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`generate-component-map.js`](../../../scripts/generate-component-map.js) | Gate o generador de CI para generate component map. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`generate-file-map.js`](../../../scripts/generate-file-map.js) | Gate o generador de CI para generate file map. | — | Al cambiar el gate, inventario o criterio de CI. |
| [`lint.js`](../../../scripts/lint.js) | Gate o generador de CI para lint. | `../lint.config.cjs` | Al cambiar el gate, inventario o criterio de CI. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
