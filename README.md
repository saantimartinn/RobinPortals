# Robin Subscriptions · The Robin Plan

Portal independiente de suscripción de Project Robin. React/Vite en el navegador,
Netlify Functions en el servidor y un proyecto Supabase propio. No incluye el portal de alumnos.

## Estructura

```text
frontend/              React, pantallas por dominio, cliente API y recursos
backend/functions/     23 entradas HTTP de Netlify
backend/lib/           Sesiones, datos, Stripe, IA, correo y servicios compartidos
supabase/migrations/   Esquema estructural sin usuarios predeterminados
supabase/seeds/        Ejemplos opcionales para desarrollo
scripts/               Verificación, mapas y creación explícita de administrador
test/                  Pruebas sin acceso a producción
docs/                  Arquitectura, operación y árbol navegable
```

## Desarrollo

Requisito: Node.js 22.13 o posterior; versión de referencia en `.nvmrc`.

```bash
npm ci
# Copiar .env.example a .env y configurar los proveedores necesarios.
npm run dev
```

`npm run dev` inicia Netlify Dev en `http://localhost:8888/portal/` con API del
mismo origen. `npm run dev:frontend` sirve únicamente la interfaz, sin backend.
Las cookies son Secure: para probar sesiones usa localhost compatible o HTTPS local.

```bash
npm run verify        # arquitectura, tests, build y documentación
npm run docs:generate # actualizar mapas al cambiar archivos o rutas
```

Netlify publica **solo `dist/`**. El build produce `dist/portal/`; el backend se
empaqueta aparte. No subir compilados, dependencias, credenciales o exports de datos.

## Documentación

- [Árbol navegable](docs/codebase/README.md) y [mapa de archivos](docs/FILE_MAP.md).
- [Arquitectura](docs/ARCHITECTURE.md), [frontend](docs/FRONTEND_ARCHITECTURE.md) y [backend](docs/BACKEND_ARCHITECTURE.md).
- [Inventario API](docs/API_INVENTORY.md) y [contratos](docs/API_CONTRACTS.md).
- [Base de datos](docs/DATABASE_CURRENT.md), [entorno](docs/ENVIRONMENT.md) y [autorización](docs/AUTHORIZATION.md).
- [Despliegue y operación](docs/OPERATIONS.md), [pruebas](docs/TESTING.md) y [limpieza realizada](docs/CLEANUP.md).
- [Riesgos y trabajo pendiente](docs/KNOWN_LIMITATIONS.md).

Toda la documentación mantenida, salvo este README, vive en `docs/`, siguiendo
el patrón de [robin-platform](https://github.com/saantimartinn/robin-platform).
