# Runtime de Netlify

[← Subir un nivel](../README.md)

**Ruta real:** `netlify/`

Entrypoints serverless, protección Edge y estructura desplegada por Netlify.

**Entra aquí:** Cuando trabajes en rutas API, tareas programadas o protección previa a los endpoints.

## Subcarpetas

| Carpeta | Qué contiene | Entra aquí cuando |
|---|---|---|
| [`edge-functions/`](edge-functions/README.md) | Protecciones ligeras ejecutadas antes de determinadas rutas API. | Cuando cambies límites de abuso o su aplicación por ruta. |
| [`functions/`](functions/README.md) | Entrypoints HTTP y programados. Validan la petición y delegan la lógica reutilizable a `lib/`. | Cuando necesites añadir, cambiar o diagnosticar un endpoint o cron concreto. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
