# Herramientas auxiliares de desarrollo

La referencia de uso y publicación es el [README principal](../README.md), con enlaces a las aplicaciones en [project-robin.com](https://project-robin.com). Esta carpeta contiene herramientas de desarrollo y pruebas; no constituye otro entorno de producción.

`run-all.mjs` coordina los procesos auxiliares, `proxy.mjs` adapta rutas para desarrollo y las herramientas de `site/` preparan configuración y entorno. Sus puertos y direcciones de prueba se definen en el código correspondiente y no son enlaces al producto publicado.

Las credenciales de producción se gestionan de forma privada en Netlify. Los archivos `.env` y sus copias no se versionan. Las herramientas de pruebas que realizan operaciones reales requieren autorización del operador y una revisión de su destino antes de ejecutarse. No ejecutar una prueba de pago ni enviar correos para verificar documentación.

## Desarrolladores: tests y logs

En Admin, la pestaña **Desarrolladores** abre directamente **Tests**. Los resultados se guardan durante 24 horas para revisar la versión ejecutada. El pago completo de Revolut sandbox requiere completar el checkout con una tarjeta de prueba; se indican número, caducidad y CVV en la ficha. Las órdenes, facturas y usuarios de esta prueba son ficticios y se limpian al verificar o cancelar.

Cada ficha indica si ejecuta un flujo, servicio o comprobación de código, o si solo verifica estructura y configuración. El resumen muestra las pruebas completadas sin presentar las comprobaciones de esquema como una garantía de que el flujo entero funciona. El botón de información detalla qué se ha probado y qué queda fuera de cada resultado.

**Logs** tiene tres orígenes: eventos Robin guardados en las tres bases que los registran, registros de funciones/Edge y actividad de despliegues de Netlify, y registros de servicios de los cuatro proyectos Supabase (Admin CRM, Alumno, Robin Jr y Community). En local, Netlify usa la sesión del CLI y el sitio vinculado; en producción, configura `NETLIFY_AUTH_TOKEN` como variable privada para Functions (el `SITE_ID` lo proporciona Netlify). Las funciones se consultan en lotes de diez para evitar que el CLI falle cuando el sitio tiene muchas funciones. Para consultar los de Supabase dentro del panel, añade `SUPABASE_MANAGEMENT_ACCESS_TOKEN` al entorno privado de Admin con permiso `analytics_logs_read`; las service role keys no dan acceso a la API de gestión. Hasta entonces, la pestaña ofrece enlaces directos a los registros de cada proyecto en Supabase Studio. No pongas estos tokens en ninguna variable `VITE_`.
