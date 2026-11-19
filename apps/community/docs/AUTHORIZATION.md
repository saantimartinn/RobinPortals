# Autorización

Dos roles: `subscriber` y `subscriber_admin`, ambos almacenados en `subscribers`.
`principalTable()` rechaza cualquier otro rol. La lectura de sesión valida JWT
HS256, expiración, uid y rol. No se consultan usuarios del portal de alumnos.

Los handlers admin comprueban `subscriber_admin`. Los flujos personales filtran por
`session.uid`; las notificaciones comprueban destinatario y los mensajes amistad.
Revisar cada operación al modificar permisos: RLS está activado, pero el service role
lo evita, por lo que las comprobaciones de servidor son obligatorias.

Pack Llegada usa la cookie existente con `auth_source=application_arrival` y el
ID del Portal verificado por su API. No crea una fila en `subscribers`.
`readSessionFromEvent` rechaza ese principal por defecto; únicamente `me`,
FAQs, soporte y partners lo aceptan explícitamente y revalidan la identidad y el producto
en el Portal. Las llamadas y pagos conservan la autorización/ownership del
Portal. Las solicitudes de soporte Llegada se filtran por `portal_user_id`,
sin mezclarlo con `user_id` de suscriptores. Véase [PACK_LLEGADA](PACK_LLEGADA.md).
El catálogo de partners se filtra además por sus productos autorizados; los
clientes con ambos productos conservan la unión de sus accesos verificados.

La autorización heredada no valida de forma uniforme una suscripción pagada en todos
los endpoints. No confundir sesión con pago activo; véase KNOWN_LIMITATIONS.
Los roles en JWT no se revalidan en base de datos por cada solicitud y una sesión
puede seguir vigente hasta 7 días tras un cambio de rol/contraseña.
