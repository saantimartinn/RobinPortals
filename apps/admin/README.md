# Robin Admin

Panel interno de Project Robin para CRM, operaciones, finanzas, analítica e
integraciones. Forma parte del sitio Netlify unificado del monorepo. El navegador
ejecuta React/Vite; las rutas de datos se sirven con Netlify Functions y servicios
de dominio en `lib/`.

## Producción

Acceso: [https://project-robin.com/admin/](https://project-robin.com/admin/), con una cuenta administrativa autorizada desde el [login común](https://project-robin.com/login).

La compilación y publicación se realizan desde la raíz del monorepo; consulta el [README principal](../../README.md). Las credenciales y los exports del CRM se gestionan fuera de Git. Las claves de servicio pertenecen a Functions y no deben usar el prefijo `VITE_`.

## Documentación

- [READMELONG](READMELONG.md): descripción extensa del producto y sus límites técnicos.
- [USERGUIDE](USERGUIDE.md): árbol de navegación para entender el repositorio y seguir flujos entre repos.
- [Arquitectura](docs/ARCHITECTURE.md): capas, dependencias y datos.
- [Cloudflare y enrutamiento](docs/CLOUDFLARE_ROUTING.md): entrada desde `project-robin.com` hasta Netlify y Functions.
- [Mapa técnico de archivos](docs/FILE_MAP.md), mantenido manualmente, y [índice generado](docs/FILE_INDEX.generated.md) con el [árbol de código](docs/codebase/README.md).
- [Inventario de API](docs/API_INVENTORY.md): rutas de Netlify y handlers.
- [Análisis CRM histórico](docs/crm-historical-metrics.md) y [mapeo CRM de Notion](docs/notion-crm-mapping.md).
- [Mentoría y conversión](../portal/docs/MENTORIA_CONVERSION.md): precio y cambio a General, Delft o Llegada en el Portal del Alumno.

## Apps relacionadas

- [Portal del Alumno](../portal/README.md): expediente e identidad compartida.
- [Robin Community](../community/README.md): comunidad y suscripción.
- [Robin Jr](../robinjr/README.md): programa Junior.

El árbol y los contratos de los otros repos se enlazan desde [USERGUIDE](USERGUIDE.md).
