# Robin Platform

Portal del Alumno dentro del sitio Netlify unificado de Project Robin. El frontend
React/Vite se publica en `/portal/`; su API se ejecuta en Functions del mismo sitio
y accede a los proveedores externos desde backend.

## Producción

Acceso: [https://project-robin.com/portal/](https://project-robin.com/portal/), con una cuenta autorizada desde el [login común](https://project-robin.com/login).

Esta aplicación se publica junto con las otras tres desde la raíz del monorepo. La compilación del sitio y sus Functions se describen en el [README principal](../../README.md). Las claves privadas se configuran en Netlify y nunca en variables de navegador `VITE_`.

Las pruebas se describen en [docs/TESTING.md](docs/TESTING.md). No subir secretos, datos personales ni exports de producción a Git.

## Documentación principal

- [READMELONG](READMELONG.md): guía técnica extensa de la plataforma y sus runtimes.
- [USERGUIDE](USERGUIDE.md): árbol de lectura por flujo, archivo y repositorio conectado.
- [Cloudflare y enrutamiento](docs/CLOUDFLARE_ROUTING.md): referencia principal del Worker público y sus destinos.
- [Árbol navegable del código](docs/codebase/README.md): recorrido de todas las carpetas y archivos del repositorio.
- [Arquitectura](docs/ARCHITECTURE.md): límites y flujo del sistema.
- [Mapa técnico mantenido](docs/FILE_MAP.md), [índice generado](docs/FILE_INDEX.generated.md), [mapa de componentes](docs/COMPONENT_MAP.md) e [inventario API](docs/API_INVENTORY.md).
- [Datos actuales](docs/DATABASE_CURRENT.md): snapshot estructural conocido.
- [Mentoría y conversión](docs/MENTORIA_CONVERSION.md): cuota única, crédito y cambio a General, Delft o Llegada.
- [Autorización](docs/AUTHORIZATION.md): principales, roles y ownership.
- [Integraciones](docs/INTEGRATIONS.md): proveedores, efectos laterales y reintentos.
- [Operación](docs/OPERATIONS.md): despliegue, rollback y diagnóstico.
- [Inventario API](docs/API_INVENTORY.md): inventario generado de Functions.
- [Entorno](docs/ENVIRONMENT.md): variables de entorno sin valores.
- [Funciones de frontend/backend](docs/userguide/): recorridos detallados por capa funcional.

## Apps relacionadas

- [Robin Admin](../admin/README.md): panel interno, CRM y finanzas.
- [Robin Community](../community/README.md): comunidad y suscripción.
- [Robin Jr](../robinjr/README.md): programa Junior.

Las descripciones principales están en `README.md`, `READMELONG.md` y `USERGUIDE.md`;
las guías técnicas y los mapas navegables viven bajo `docs/`.

## Repositorio público y licencia

El código es público, pero no tiene una licencia de código abierto. Consulta la [guía de publicación](../../docs/PUBLIC_REPOSITORY.md), [`LICENSE`](../../LICENSE) y [`SECURITY.md`](../../SECURITY.md). No publiques credenciales, datos personales ni exports.
