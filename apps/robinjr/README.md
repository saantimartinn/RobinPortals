# Robin Jr — portal de alumnos y administración

Portal de Robin Jr para alumnos y equipo administrativo, basado en la plataforma de
Project Robin. El frontend React/Vite se publica en `/portal/`; la API del mismo origen
se ejecuta en Netlify Functions y accede a proveedores externos únicamente desde backend.
La experiencia incluye perfil y progreso del alumno, carreras asignadas como tarjetas,
documentos con fechas límite, reservas, pagos y herramientas de gestión para admins.

Las reglas principales del programa son nueve fases (Diagnóstico, Tus resultados, tres
mentorías con exalumnos, dos sesiones grupales, diagnóstico final con la profesora y Wrap
up), reservas de una hora sobre eventos `RobinJr` del calendario del advisor y tres pagos
de 500 €, 500 € y 499,99 €. Las carreras no contienen documentos: el admin crea una ficha
con imagen, asignaturas y requisitos, y la asigna al alumno; los documentos y sus deadlines
se gestionan aparte.

## Desarrollo local

Requisitos: Node.js 20 o posterior. Copiar `.env.example` a un archivo local que no se
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
- [Autorización](docs/AUTHORIZATION.md): principales, roles y ownership.
- [Integraciones](docs/INTEGRATIONS.md): proveedores, efectos laterales y reintentos.
- [Operación](docs/OPERATIONS.md): despliegue, rollback y diagnóstico.
- [Inventario API](docs/API_INVENTORY.md): inventario generado de Functions.
- [Entorno](docs/ENVIRONMENT.md): variables de entorno sin valores.
- [Funciones de frontend/backend](docs/userguide/): recorridos detallados por capa funcional.

## Repos relacionados

- [Robin Admin](https://github.com/RobinManuV/Robin-Admin): panel interno, CRM administrativo y finanzas.
- [Robin Subscriptions](https://github.com/saantimartinn/robin-subscriptions): The Robin Plan y su backend/base de datos independiente.

Las descripciones principales están en `README.md`, `READMELONG.md` y `USERGUIDE.md`;
las guías técnicas y los mapas navegables viven bajo `docs/`.
