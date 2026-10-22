# 07 · Referencia por archivo y navegación del código

Este capítulo conecta los flujos descritos en USERGUIDE con los índices de todas las carpetas del repositorio. La guía te enseña qué recorrer; los mapas te llevan al archivo concreto. El código y su configuración siguen siendo la autoridad si un texto de índice quedó atrás.

## Índices por carpeta

- [Árbol completo](../codebase/README.md): entradas de cada zona del repositorio.
- [Frontend portal-source](../codebase/portal-source/README.md): aplicación, API de navegador, features, componentes y recursos.
- [Backend Netlify](../codebase/netlify/README.md): Functions, Edge y configuración de rutas.
- [Servicios `lib/`](../codebase/lib/README.md) y [módulos compartidos](../codebase/shared/README.md): lógica server-side/reutilizada.
- [Supabase](../codebase/supabase/README.md), [Cloudflare infrastructure](../codebase/infrastructure/README.md), [scripts](../codebase/scripts/README.md), [tests](../codebase/test/README.md), [docs](../codebase/docs/README.md) y [GitHub automation](../codebase/.github/README.md).
- [FILE_MAP](../FILE_MAP.md): explicación mantenida de módulos y relaciones.
- [API_INVENTORY](../API_INVENTORY.md): endpoint, método/ruta y handler candidato.
- [COMPONENT_MAP](../COMPONENT_MAP.md): localización de componentes y composición de UI.
- [PRIVACY_DATA_MAP](../PRIVACY_DATA_MAP.md): mapa orientativo de flujos de datos personales.

## Recorrido a nivel de archivo

1. Desde un feature, sigue imports a la fachada `portal-source/src/api.js`; esta mantiene exports compatibles mientras los módulos reales están agrupados bajo `portal-source/src/api/`.
2. Desde una operación de API, localiza su ruta en `netlify.toml`, abre la Function y continúa a servicios, shared modules o cliente Supabase.
3. Desde una ruta pública, abre `infrastructure/cloudflare/project-robin-router.js`, identifica la regla por host/path y comprueba después el destino Netlify.
4. Si la operación modifica datos, continúa hasta tabla, migration, permisos y consumers, no pares en la Function.
5. Si atraviesa producto, abre la guía equivalente de Robin Admin o Subscriptions y revisa ambos lados del contrato.

El mapa de carpetas orienta, pero puede no mostrar imports dinámicos, lectura de variables de entorno, llamadas indirectas o efectos de un proveedor. Busca referencias antes de mover o eliminar una entrada y comprueba sus consumers en los repos vecinos cuando el contrato es externo.

## Mantener el mapa

Después de añadir o reubicar archivos, consulta `package.json` para regenerar índices con el script mantenido por el repo; inspecciona el diff en vez de asumir que generación automática documenta la intención. Para una relación compleja entre módulos actualiza también [FILE_MAP](../FILE_MAP.md) y el capítulo de capa correspondiente. Verifica todos los enlaces y la concordancia con `netlify.toml`/Worker al cambiar rutas.

## Continuar

- [USERGUIDE principal](../../USERGUIDE.md)
- [06 · Cloudflare y flujos cross-repo](06-cloudflare-and-cross-repo.md)
- [Robin Admin · índice por archivo](https://github.com/RobinManuV/Robin-Admin/blob/main/docs/userguide/07-source-file-reference.md)
- [Robin Subscriptions · índice por archivo](https://github.com/saantimartinn/robin-subscriptions/blob/main/docs/userguide/07-source-file-reference.md)

**Volver al inicio:** [USERGUIDE](../../USERGUIDE.md) · [READMELONG](../../READMELONG.md)

**Fin del recorrido secuencial:** [volver al índice USERGUIDE](../../USERGUIDE.md).
