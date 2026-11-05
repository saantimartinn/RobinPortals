# Robin Platform

Portal del Alumno dentro del sitio Netlify unificado de Project Robin. El frontend
React/Vite se publica en `/portal/`; su API se ejecuta en Functions del mismo sitio
y accede a los proveedores externos desde backend. Para arrancar las cuatro apps
juntas en local, usa `npm run dev` desde la raíz del monorepo.

## Desarrollo local

Requisitos del sitio unificado: Node.js 22. Copiar `.env.example` a un archivo local que no se
versione y completar solo las variables necesarias para el flujo que se vaya a probar.

```bash
npm ci
npm --prefix portal-source ci --include=dev
npm --prefix portal-source run dev
```

El conjunto completo de verificaciones se describe en [docs/TESTING.md](docs/TESTING.md). Nunca
se deben guardar secretos, datos personales ni exports de producción en Git.

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
