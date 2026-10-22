# Netlify Edge Functions

[← Subir un nivel](../README.md)

**Ruta real:** `netlify/edge-functions/`

Protecciones ligeras ejecutadas antes de determinadas rutas API.

**Entra aquí:** Cuando cambies límites de abuso o su aplicación por ruta.

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`rate-limit-expensive.mjs`](../../../../netlify/edge-functions/rate-limit-expensive.mjs) | Protección Edge para rate limit expensive. | — | Al cambiar la protección Edge de las rutas asociadas. |
| [`rate-limit-identity.mjs`](../../../../netlify/edge-functions/rate-limit-identity.mjs) | Protección Edge para rate limit identity. | — | Al cambiar la protección Edge de las rutas asociadas. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
