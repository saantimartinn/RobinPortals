# Autorización

Dos roles: `subscriber` y `subscriber_admin`, ambos almacenados en `subscribers`.
`principalTable()` rechaza cualquier otro rol. La lectura de sesión valida JWT
HS256, expiración, uid y rol. No se consultan usuarios del portal de alumnos.

Los handlers admin comprueban `subscriber_admin`. Los flujos personales filtran por
`session.uid`; las notificaciones comprueban destinatario y los mensajes amistad.
Revisar cada operación al modificar permisos: RLS está activado, pero el service role
lo evita, por lo que las comprobaciones de servidor son obligatorias.

La autorización heredada no valida de forma uniforme una suscripción pagada en todos
los endpoints. No confundir sesión con pago activo; véase KNOWN_LIMITATIONS.
Los roles en JWT no se revalidan en base de datos por cada solicitud y una sesión
puede seguir vigente hasta 7 días tras un cambio de rol/contraseña.
