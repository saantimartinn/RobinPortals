# 07 · Referencia por archivo y navegación del código

Esta última página conecta la lectura por capas de USERGUIDE con los índices que apuntan a cada archivo. La guía ayuda a formar el modelo mental de la aplicación; los índices de carpeta permiten continuar desde un concepto hasta sus componentes, funciones API, handlers y servicios concretos.

## Índices disponibles

- [Árbol completo](../codebase/README.md): índice raíz de carpetas y fuentes.
- [Frontend](../codebase/frontend/README.md): workspace Vite, aplicación, API, features y UI compartida.
- [Backend](../codebase/backend/README.md), [Functions](../codebase/backend/functions/README.md) y [librerías](../codebase/backend/lib/README.md): handlers HTTP y lógica reutilizable.
- [Supabase](../codebase/supabase/README.md), [scripts](../codebase/scripts/README.md), [tests](../codebase/test/README.md) y [GitHub automation](../codebase/.github/README.md).
- [FILE_MAP](../FILE_MAP.md): responsabilidades y conexiones principales escritas para lectura humana.
- [API_INVENTORY](../API_INVENTORY.md): localizador de endpoints hacia Functions.
- [COMPONENT_MAP](../COMPONENT_MAP.md): archivos y composición de interfaz.
- [PRIVACY_DATA_MAP](../PRIVACY_DATA_MAP.md): orientación para seguir flujos de datos personales.

## Desde la pantalla hasta cada archivo

1. Encuentra el owner en `frontend/src/application/` o `frontend/src/features/`; abre las referencias desde [02 · Frontend](02-subscriber-frontend.md).
2. Sigue el export importado desde `frontend/src/api/index.js` para conocer la ruta, verbo, credenciales y formato de respuesta.
3. Resuelve la ruta en `netlify.toml`, usa el inventario API para encontrar el handler y confirma su implementación real.
4. Abre los módulos importados bajo `backend/lib/`; rastrea principal, permiso, acceso a DB/proveedor, errores y efectos laterales.
5. Para cambios persistentes, localiza migration/schema y consumidores; para cambios de SSO o routing abre [06 · Cross-repo](06-cloudflare-cross-repo.md).

Los índices ayudan a localizar código, pero una lista de exports no describe todas las llamadas indirectas ni comportamiento dinámico. Usa búsqueda de referencias antes de mover o retirar archivos. No asumas que dos tablas de este repo y Platform tienen el mismo owner o contrato.

## Mantener los enlaces y los índices

Cuando cambies una ruta, módulo o export, revisa sus enlaces en este árbol, [FILE_MAP](../FILE_MAP.md), API/component maps y documentación de dominios. Usa el script declarado en `package.json` para regenerar los índices cuando corresponda y revisa el diff. Las explicaciones de permisos, idempotencia o ownership deben mantenerse en los capítulos temáticos además de aparecer como descripción corta en el mapa.

## Continuar

- [USERGUIDE principal](../../USERGUIDE.md)
- [06 · Cloudflare y relaciones cross-repo](06-cloudflare-cross-repo.md)
- [Robin Platform · índice por archivo](https://github.com/RobinManuV/Robin-platform-cliente/blob/main/docs/userguide/07-source-file-reference.md)
- [Robin Admin · índice por archivo](https://github.com/RobinManuV/Robin-Admin/blob/main/docs/userguide/07-source-file-reference.md)

**Volver al inicio:** [USERGUIDE](../../USERGUIDE.md) · [READMELONG](../../READMELONG.md)

**Fin del recorrido secuencial:** [volver al índice USERGUIDE](../../USERGUIDE.md).
