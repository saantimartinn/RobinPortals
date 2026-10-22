# Frontend React/Vite

[← Subir un nivel](../README.md)

**Ruta real:** `portal-source/`

Proyecto frontend independiente que genera el portal publicado en `/portal/`.

**Entra aquí:** Cuando cambies dependencias, build o configuración del frontend.

## Subcarpetas

| Carpeta | Qué contiene | Entra aquí cuando |
|---|---|---|
| [`public/`](public/README.md) | Archivos copiados sin transformación al build público. | Cuando añadas una descarga o recurso que deba conservar su nombre. |
| [`src/`](src/README.md) | Composición React, sesión, cliente API, estilos y utilidades del navegador. | Cuando cambies comportamiento o presentación del portal. |

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`index.html`](../../../portal-source/index.html) | Documento HTML base en el que Vite monta React. | — | Cuando cambie la responsabilidad indicada. |
| [`package-lock.json`](../../../portal-source/package-lock.json) | Resolución reproducible de dependencias del frontend. | — | Solo como resultado de un cambio intencional de dependencias. |
| [`package.json`](../../../portal-source/package.json) | Dependencias y comandos Vite del frontend. | — | Al cambiar dependencias, scripts o requisitos de Node.js. |
| [`postcss.config.js`](../../../portal-source/postcss.config.js) | Transformaciones CSS aplicadas durante el build. | — | Cuando cambie la responsabilidad indicada. |
| [`tailwind.config.js`](../../../portal-source/tailwind.config.js) | Rutas de contenido y tema de Tailwind CSS. | — | Cuando cambie la responsabilidad indicada. |
| [`vite.config.js`](../../../portal-source/vite.config.js) | Configuración de compilación y desarrollo de Vite. | — | Cuando cambie la responsabilidad indicada. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
