# Robin Platform — árbol navegable

**Ruta real:** `./`

Punto de entrada para entender el repositorio completo antes de bajar a una capa concreta.

**Entra aquí:** Cuando necesites localizar dónde vive una responsabilidad o seguir el flujo completo de una petición.

## Cómo recorrer el código

1. Empieza por la configuración raíz para entender build y despliegue.
2. Sigue `portal-source/` para la experiencia del navegador.
3. Sigue una llamada desde `netlify/functions/` hacia los servicios de `lib/`.
4. Consulta `shared/` para reglas idénticas en frontend y backend.
5. Usa `test/` y `scripts/` para saber qué contrato protege CI.

Este árbol cubre 316 archivos mantenidos en 29 carpetas. Los propios READMEs generados se excluyen para evitar una referencia recursiva.

## Subcarpetas

| Carpeta | Qué contiene | Entra aquí cuando |
|---|---|---|
| [`.github/`](.github/README.md) | Configuración de automatizaciones asociadas al repositorio. | Cuando cambies procesos que se ejecutan a partir de commits o pull requests. |
| [`docs/`](docs/README.md) | Documentación mantenida sobre arquitectura, seguridad, operación, datos e inventarios. | Cuando necesites comprender decisiones y contratos antes de modificar código. |
| [`infrastructure/`](infrastructure/README.md) | Contenido mantenido de `infrastructure/`. | Cuando necesites trabajar en esta parte concreta del repositorio. |
| [`lib/`](lib/README.md) | Reglas de dominio, autorización, validación y adaptadores usados por las Netlify Functions. | Cuando la lógica sea reutilizable o no pertenezca al borde HTTP de un endpoint. |
| [`netlify/`](netlify/README.md) | Entrypoints serverless, protección Edge y estructura desplegada por Netlify. | Cuando trabajes en rutas API, tareas programadas o protección previa a los endpoints. |
| [`portal-source/`](portal-source/README.md) | Proyecto frontend independiente que genera el portal publicado en `/portal/`. | Cuando cambies dependencias, build o configuración del frontend. |
| [`scripts/`](scripts/README.md) | Gates estáticos y generadores ejecutados localmente y en CI. | Cuando cambies una regla de calidad o un inventario generado. |
| [`shared/`](shared/README.md) | Configuración de dominio consumida tanto por Node.js como por el frontend. | Cuando backend y frontend deban aplicar exactamente la misma regla. |
| [`supabase/`](supabase/README.md) | Contenido mantenido de `supabase/`. | Cuando necesites trabajar en esta parte concreta del repositorio. |
| [`test/`](test/README.md) | Regresiones unitarias y de límites arquitectónicos ejecutadas por Node.js. | Cuando cambies comportamiento o quieras fijar un contrato antes de refactorizar. |

## Archivos

| Archivo | Qué hace | Relaciones clave | Modifícalo cuando |
|---|---|---|---|
| [`.env.example`](../../.env.example) | Inventario de variables de entorno permitidas, siempre sin valores reales. | — | Cuando cambie la responsabilidad indicada. |
| [`.gitignore`](../../.gitignore) | Evita versionar dependencias, builds, secretos y artefactos locales. | — | Cuando cambie la responsabilidad indicada. |
| [`README.md`](../../README.md) | Portada del proyecto con arranque local y enlaces de documentación. | — | Cuando cambie la responsabilidad indicada. |
| [`READMELONG.md`](../../READMELONG.md) | Archivo mantenido del repositorio: READMELONG.md. | — | Cuando cambie la responsabilidad indicada. |
| [`USERGUIDE.md`](../../USERGUIDE.md) | Archivo mantenido del repositorio: USERGUIDE.md. | — | Cuando cambie la responsabilidad indicada. |
| [`lint.config.cjs`](../../lint.config.cjs) | Patrones y carpetas usados por el lint de seguridad local. | — | Cuando cambie la responsabilidad indicada. |
| [`netlify.toml`](../../netlify.toml) | Fuente de verdad de build, redirects, headers, Edge Functions y schedules de Netlify. | — | Al cambiar despliegue, rutas, cabeceras o schedules. |
| [`package-lock.json`](../../package-lock.json) | Resolución reproducible de dependencias raíz; se regenera con npm. | — | Solo como resultado de un cambio intencional de dependencias. |
| [`package.json`](../../package.json) | Dependencias y metadatos del backend y de los scripts raíz. | — | Al cambiar dependencias, scripts o requisitos de Node.js. |

---

Este README se regenera con `node scripts/generate-codebase-docs.js`. No lo edites de forma aislada: mejora el generador o la documentación fuente.
