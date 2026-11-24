# Project Robin

Plataforma en producción para alumnos, Robin Jr, The Robin Plan y el equipo de Project Robin. Las cuatro aplicaciones se construyen y publican juntas en un único sitio Netlify, servido por Cloudflare bajo el dominio público. La web comercial es un proyecto independiente.

## Aplicaciones en producción

| Aplicación | Acceso |
| --- | --- |
| Login común | [project-robin.com/login](https://project-robin.com/login) |
| Portal del Alumno | [project-robin.com/portal/](https://project-robin.com/portal/) |
| Robin Jr | [project-robin.com/robinjr/](https://project-robin.com/robinjr/) |
| The Robin Plan | [project-robin.com/therobinplan/](https://project-robin.com/therobinplan/) |
| Administración | [project-robin.com/admin/](https://project-robin.com/admin/) |

Los portales y el panel requieren una cuenta autorizada. El repositorio público no concede acceso a datos ni incluye credenciales de uso.

## Estructura

- `apps/portal`: expediente, onboarding, documentos, reservas y pagos del alumno.
- `apps/robinjr`: programa Junior, progreso, mentorías y pagos.
- `apps/community`: suscripción, comunidad y acceso del Pack Llegada.
- `apps/admin`: CRM, operaciones, finanzas e integraciones internas.
- `packages/`: autenticación, navegación, traducciones, marca y reglas compartidas.
- `site/`: configuración, compilación y pruebas del sitio unificado.
- `infra/cloudflare/`: enrutamiento del dominio público.
- `dev/`: herramientas auxiliares de desarrollo; no es el entorno publicado.
- `apps/ios/`: prototipo nativo, todavía no distribuido en App Store.

## Publicación y verificación

Se requiere Node.js 22.13 o posterior. Desde la raíz del monorepo:

```bash
npm ci
npm test
npm run site:build
```

Netlify usa `node site/build.mjs --install`; la salida publicada se prepara en `site/.output/`. El archivo `netlify.toml` de raíz se genera a partir de los de cada aplicación con `npm run site:config`. Los cambios de código solo llegan a producción cuando el despliegue correspondiente queda publicado; el último commit de Git por sí solo no acredita qué versión está sirviendo Netlify.

[Cloudflare y rutas](infra/cloudflare/README.md) explica el salto al sitio unificado y las excepciones de webhooks heredados. Las variables privadas se configuran en Netlify, con los prefijos `PORTAL__`, `ROBINJR__`, `COMMUNITY__` y `ADMIN__`. Los archivos `.env.example` documentan nombres y valores ficticios. Los secretos, exports y credenciales pertenecen a almacenamiento privado fuera de Git.

Las tareas programadas solo se ejecutan con `ROBIN_RUN_SCHEDULED=true`; la transición entre sitios requiere evitar envíos duplicados.

## Documentación

- [Guía del repositorio público, privacidad y licencias](docs/PUBLIC_REPOSITORY.md)
- [Portal del Alumno](apps/portal/README.md)
- [Robin Jr](apps/robinjr/README.md)
- [The Robin Plan](apps/community/README.md)
- [Administración](apps/admin/README.md)
- [Mentoría y conversión](apps/portal/docs/MENTORIA_CONVERSION.md)
- [Primitivas de autenticación](packages/auth/README.md)

Las guías técnicas explican contratos y operación. Sus ejemplos no son cuentas de acceso ni deben contener datos de clientes.

## Licencia y reutilización

Este repositorio es público, pero **no está publicado bajo una licencia de código abierto**. Consulta [`LICENSE`](LICENSE) y la [guía de derechos y reutilización](docs/PUBLIC_REPOSITORY.md#derechos-de-autor-y-reutilización). GitHub permite a sus usuarios ver y bifurcar repositorios públicos; eso no concede una licencia general para reutilizar el código fuera de la plataforma. El código, las fotografías, las marcas y otros recursos pueden tener titulares y condiciones distintos.

Para reportar un problema de seguridad, consulta [`SECURITY.md`](SECURITY.md). No publiques secretos, datos de clientes ni detalles de vulnerabilidades sin corregir en incidencias públicas.
