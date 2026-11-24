# Robin Subscriptions · The Robin Plan

App de suscripción y comunidad de Project Robin (The Robin Plan), publicada
con las otras tres apps en el sitio Netlify unificado. React/Vite se ejecuta
en el navegador, Netlify Functions en el servidor y el dominio de datos de
suscripción usa un proyecto Supabase propio.

Los clientes con un Pack Llegada firmado pueden usar una variante reducida con
su identidad del Portal del Alumno, sin crear otra cuenta. Una suscripción
Community activa conserva la experiencia completa. Consulta [Pack Llegada](docs/PACK_LLEGADA.md)
para los permisos, contratos, integraciones y la migración previa al despliegue.

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

## Producción

Acceso: [https://project-robin.com/therobinplan/](https://project-robin.com/therobinplan/), con una cuenta autorizada desde el [login común](https://project-robin.com/login).

El sitio unificado compila esta aplicación y empaqueta sus Functions con las otras tres. Consulta el [README principal](../../README.md) para los comandos de verificación y publicación. Los secretos de suscripción y las claves de servicio se configuran exclusivamente en el entorno privado de Netlify.

Las pruebas de esta aplicación se ejecutan con `npm test`; `npm run docs:generate` actualiza los mapas de documentación. No subir compilados, dependencias, credenciales ni exports de clientes.

## Documentación


- [READMELONG](READMELONG.md): proyecto, contratos, flujos y runtimes con contexto técnico extendido.
- [USERGUIDE](USERGUIDE.md): índice de lectura por módulos, endpoints y repos conectados.
- [Cloudflare y enrutamiento](docs/CLOUDFLARE_ROUTING.md): paths públicos, Worker y salto a Netlify.
- [Mapa técnico mantenido](docs/FILE_MAP.md), [índice generado](docs/FILE_INDEX.generated.md) y [árbol navegable](docs/codebase/README.md).
- [Arquitectura](docs/ARCHITECTURE.md), [contratos API](docs/API_CONTRACTS.md) y [autorización](docs/AUTHORIZATION.md).
- [Inventario API](docs/API_INVENTORY.md) y [contratos](docs/API_CONTRACTS.md).
- [Base de datos](docs/DATABASE_CURRENT.md), [entorno](docs/ENVIRONMENT.md) y [autorización](docs/AUTHORIZATION.md).
- [Despliegue y operación](docs/OPERATIONS.md) y [pruebas](docs/TESTING.md).
- [Riesgos y trabajo pendiente](docs/KNOWN_LIMITATIONS.md).

## Apps relacionadas

- [Robin Platform cliente](../portal/README.md): portal de aplicación y proveedor validado para SSO.
- [Robin Admin](../admin/README.md): administración principal y CRM.

Las tres entradas principales son `README.md`, `READMELONG.md` y `USERGUIDE.md`;
las guías técnicas y los mapas navegables se mantienen bajo `docs/`.
