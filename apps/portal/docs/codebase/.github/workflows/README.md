# Workflows de GitHub Actions

[← Subir un nivel](../README.md)

**Ruta real:** `.github/workflows/`

Pipelines que validan el repositorio antes y después de integrar cambios.

**Entra aquí:** Cuando añadas o retires un gate, una versión de runtime o un paso de build.

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`ci.yml`](../../../../.github/workflows/ci.yml) | Pipeline principal: instala, valida inventarios, ejecuta tests y construye el frontend. | — | Al cambiar los pasos obligatorios de GitHub Actions. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
