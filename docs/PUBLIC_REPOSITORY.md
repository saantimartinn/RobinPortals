# Guía del repositorio público

Esta guía describe qué contiene el monorepo de Project Robin, cómo se relaciona con el servicio publicado y qué límites deben tener presentes quienes lleguen desde GitHub o LinkedIn.

## Estado para difusión

Se retiraron del historial público los archivos personales de imagen y el seed por filas del CRM mediante una reescritura de los refs publicados. Esa limpieza no borra copias en clones, forks, cachés ni los registros que ya se hayan cargado en producción. Esta guía no certifica por sí sola que cada permiso, dato o recurso de terceros esté listo para difusión.

## Estado del producto

Project Robin es una plataforma de acompañamiento para estudiantes que se preparan para estudiar en el extranjero. Este repositorio contiene el monorepo de sus portales de alumno, Robin Jr, The Robin Plan y administración interna. El sitio público se sirve en [project-robin.com](https://project-robin.com); las aplicaciones requieren cuentas autorizadas.

El código de `main` se despliega como un sitio unificado en Netlify y se enruta mediante Cloudflare. La publicación visible depende del estado del despliegue de Netlify, no solo de que un commit exista en GitHub. El [README principal](../README.md) enlaza las rutas de producción, los comandos de desarrollo y las guías por aplicación.

## Qué contiene

- `apps/portal`: portal del alumno, expediente, onboarding, reservas y pagos.
- `apps/robinjr`: producto y operaciones del programa Junior.
- `apps/community`: suscripción, comunidad y Pack Llegada.
- `apps/admin`: CRM y herramientas internas de operación, finanzas e integraciones.
- `packages/`: componentes, traducciones y reglas compartidas.
- `site/` e `infra/`: compilación del sitio unificado y enrutamiento de Cloudflare.
- `apps/ios/`: prototipo nativo; no es una aplicación distribuida en App Store.

El repositorio contiene código de cliente y de servidor. Publicar el código no concede acceso a Netlify, Supabase, Stripe, calendarios, CRM, cuentas ni datos de producción.

## Datos, privacidad y medios

Las aplicaciones de producción procesan información personal para prestar sus servicios. Los detalles de identidad, integraciones y flujos se documentan en las guías de [Portal](../apps/portal/docs/PRIVACY_DATA_MAP.md), [Community](../apps/community/docs/PRIVACY_DATA_MAP.md), [Admin](../apps/admin/docs/DATAFLOW.md) y [RBMT](https://github.com/RobinManuV/Bachelor-Matching-Tool-/blob/main/docs/PUBLIC_REPOSITORY.md).

El histórico por lead ya no está versionado en Git. La estructura de tablas y el importador siguen formando parte del código; los datos que se hayan cargado en Supabase son independientes del repositorio y no se borran al reescribir Git. La limpieza de Git tampoco cambia el control de acceso, la retención ni la base jurídica de esos registros en producción.

Los portales Portal y Robin Jr guardan los avatares y documentos personales en Supabase Storage privado y entregan URLs firmadas después de comprobar la sesión. El código de Community está preparado para guardar avatares y fotos de mentores en el bucket privado `community-private-images` y entregar enlaces firmados temporales a miembros autenticados. Su activación en producción requiere aplicar primero la migración y ejecutar el backfill de valores data URL ya existentes; esta sesión no está conectada al proyecto Supabase para comprobar esos pasos. Las ilustraciones, marcas y recursos estáticos destinados a páginas públicas siguen siendo accesibles a cualquier visitante; comprueba sus licencias y consentimientos antes de reutilizarlos. Las antiguas fotos personales eliminadas del historial Git no forman parte del árbol de las ramas y etiquetas públicas comprobadas; forks, clones y cachés externos pueden conservar copias.

## Seguridad y configuración

- Los secretos de producción se guardan en los entornos privados de los servicios; los archivos `.env.example` son guías de nombres, no configuraciones de producción.
- No añadas a Git claves, tokens, exports de CRM, informes privados, copias de bases de datos ni capturas con cuentas o datos reales.
- La autenticación propia de las aplicaciones almacena contraseñas con bcrypt y acepta hashes; los servicios de Supabase Auth gestionan sus propias credenciales.
- La [política de seguridad](../SECURITY.md) indica cómo comunicar un hallazgo sin publicarlo en una incidencia abierta.
- Los detalles por producto están en las políticas de [Portal](../apps/portal/docs/PASSWORD_POLICY.md), [Robin Jr](../apps/robinjr/docs/PASSWORD_POLICY.md) y [Community](../apps/community/docs/PASSWORD_POLICY.md).

Los controles del producto no sustituyen una revisión de configuración, privacidad, permisos, dependencias y datos antes de un despliegue o integración externa.

## Desarrollo

Se requiere Node.js 22.13 o posterior. Desde la raíz:

```bash
npm ci
npm test
npm run site:build
```

El README de cada aplicación explica su estructura y enlaza la guía de arquitectura, operación, APIs y pruebas. Los diagramas de archivos bajo `docs/codebase/` y los índices con sufijo `.generated.md` se generan desde el código; no son especificaciones contractuales independientes.

## Derechos de autor y reutilización

Este repositorio no tiene una licencia de código abierto como MIT, Apache-2.0, GPL o AGPL. El archivo [`LICENSE`](../LICENSE) reserva los derechos de los titulares correspondientes y no autoriza la reutilización general del código. Un componente que tenga su propio aviso o licencia debe evaluarse por separado.

Que el repositorio sea público **no impide que otros usuarios de GitHub lo vean y lo bifurquen dentro de GitHub**. Los Términos de GitHub conceden esos derechos de plataforma para repositorios públicos; una licencia adicional es la que otorga derechos de reutilización fuera de esas funciones. Por tanto, “todos los derechos reservados” ayuda a aclarar la política, pero no convierte un repositorio público en privado ni bloquea técnicamente las copias o forks que permite GitHub. Para impedir el acceso y los forks de GitHub, habría que cambiar la visibilidad del repositorio a privado.

No se ha declarado que todos los derechos de cada archivo pertenezcan a una sola entidad: las contribuciones y los materiales de terceros pueden tener titulares distintos. Consulta al titular correspondiente antes de pedir o conceder permisos adicionales.

| Tipo de licencia/política | Qué permite normalmente | ¿Evita que copien el código? |
|---|---|---|
| Sin licencia / todos los derechos reservados | No concede permisos generales de reutilización fuera de los derechos limitados de GitHub y los permitidos por ley. | Es la opción más restrictiva, pero no bloquea la visualización ni los forks que GitHub permite para repositorios públicos. |
| MIT o BSD | Copiar, modificar, distribuir e incluso usar comercialmente, conservando avisos y licencia. | No. Son licencias permisivas. |
| Apache-2.0 | Reutilizar y redistribuir, con avisos, condiciones y concesión de patentes. | No. Permite reutilización, incluso comercial, bajo sus condiciones. |
| GPL-3.0 o AGPL-3.0 | Copiar, modificar y distribuir bajo copyleft; la AGPL añade obligaciones para ciertos usos de versiones modificadas por red. | No. Exigen condiciones para distribuir/operar derivados; no prohíben copiarlos. |

La selección final depende de quién posee los derechos y qué usos se quieren conceder. No cambies a una licencia abierta sin confirmar esos derechos y revisar por separado los assets de terceros.

Referencias: [licenciar un repositorio en GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository), [Términos de GitHub, licencia para otros usuarios](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#5-license-grant-to-other-users) y [Ley de Propiedad Intelectual española, arts. 1–2](https://www.boe.es/buscar/act.php?id=BOE-A-1996-8930).

## Antes de difundir el enlace

- Comprueba las ramas y etiquetas públicas después de cualquier reescritura y recuerda que las copias ya clonadas y los forks pueden conservar objetos antiguos.
- Verifica en Supabase la privacidad efectiva del bucket de avatares/documentos y los permisos de las tablas históricas; la migración local no prueba que la configuración de producción coincida.
- Confirma los derechos y consentimientos para fotografías, testimonios, logos, marcas y recursos educativos.
- Comprueba que el repositorio no incluya secretos, datos de clientes, exports ni capturas con información real.
- Asegúrate de que la descripción de LinkedIn no presente este repositorio propietario como software de código abierto.

Una descripción factual puede decir que el repositorio publica una vista del código de la plataforma, mientras que los portales de producción requieren cuentas autorizadas. No lo describas como “open source”, como libre para copiar, ni como un repositorio sin datos históricos.

La guía prepara la información del repositorio; no certifica que cada elemento de su historial, dependencia o recurso visual esté libre de obligaciones de terceros.
