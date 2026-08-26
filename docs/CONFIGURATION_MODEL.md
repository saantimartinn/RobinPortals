# Configuración

`netlify.toml` define rutas, cabeceras y salida pública. `frontend/vite.config.js`
define base `/portal/` y salida `dist/portal`. `.nvmrc` y engines fijan Node 22.13+.
El lockfile raíz fija dependencias de frontend y servidor.

Los secretos viven solo en entorno. Los importes base mensual/anual están en
`backend/lib/subscription.js`; los Price IDs opcionales se leen por variable.
Los catálogos visuales y niveles están en `frontend/src/shared/constants.js`.
Actualizar precios requiere contrastar UI, backend y configuración Stripe.

Se usa Vite 7 con el objetivo de navegadores explícito equivalente al build anterior,
para no elevarlo implícitamente al actualizar herramientas. Referencias de migración:
[Vite 5 a 6](https://v6.vite.dev/guide/migration) y
[Vite 6 a 7](https://v7.vite.dev/guide/migration).
El watcher excluye `.netlify/` para evitar bucles y bloqueos de archivos en Windows.
