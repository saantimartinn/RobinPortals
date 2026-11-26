# Administradores PRO y vinculados

Los vínculos no cambian los permisos por pestañas. Un administrador puede estar
vinculado a varios PRO; cada PRO crea y elimina exclusivamente su propia relación.
Configuración permite vincular cuentas existentes, compartir clientes por portal
y activar de nuevo el tutorial de una persona concreta.

## Clientes y calendarios

`users.assigned_to` (o `subscribers.assigned_to` en Community) sigue siendo el
responsable principal. `admin_client_shares` añade acceso de gestión al vinculado
sin cambiar ese campo. Una cuenta conserva simultáneamente clientes propios y
compartidos. Las reservas consultan el calendario del responsable principal.
Las credenciales OAuth de un nuevo asesor deben configurarse antes de usar su
calendario; no se utiliza como sustituto el calendario de su PRO.

Las cuentas de Noel, Manuel y María mantienen sus variables OAuth existentes.
Para asesores adicionales, `GOOGLE_ADVISOR_REFRESH_TOKENS` es un objeto JSON
privado que relaciona email y refresh token, configurado en los runtimes de los
portales correspondientes. Esta variable no concede rol PRO ni acceso de admin.
Nunca debe exponerse con prefijo `VITE_` ni versionarse con valores reales.

La vista global conserva la consulta de otros alumnos. Las acciones individuales
del portal comprueban en servidor la propiedad o la asignación compartida. Al
retirarla, se pierde la gestión y el acceso al historial privado por esa vía; los
clientes propios y las asignaciones de otros PRO se conservan. Los enlaces de
descarga firmados que ya se hayan emitido conservan su caducidad habitual.

Community permite a cualquier administrador tomar un cliente sin responsable
desde Usuarios → Ver y asignarme → Asignarme este cliente. Pasa a ser cliente
propio del administrador, sin compartirse automáticamente con sus PRO. Si dos
administradores lo intentan a la vez, solo uno lo obtiene. La migración añade el
campo sin atribuir clientes existentes automáticamente.

## Notas de reuniones

El historial muestra también reuniones anteriores. Los resúmenes de nuevas
reuniones con clientes compartidos se envían al vinculado mediante el proveedor
de correo existente. Se guarda una cola con clave única por reunión, portal y
destinatario, reintentos y clave de idempotencia del proveedor. Se vuelve a
comprobar el vínculo y el responsable antes de enviar. Desvincular no puede
retirar mensajes entregados al buzón. Las transcripciones brutas no se envían.

## Tutorial

Una cuenta nueva creada con «Vincular a mí» recibe un recorrido obligatorio en
cada portal. Una cuenta existente solo lo recibe cuando su PRO lo activa. No hay
opción de saltar: los pasos se guardan en servidor y se reanudan al volver a entrar.
El catálogo de Admin respeta sus permisos actuales; añadir pestañas no reinicia el
recorrido automáticamente. El PRO puede reactivarlo después de una ampliación.

## Migraciones y preview local

Antes de publicar se necesitan estas migraciones; la preview no las aplica a
ningún proyecto remoto:

- Portal / identidad de Admin: `apps/admin/supabase/migrations/202611250001_admin_collaboration.sql`.
- Community: `apps/community/supabase/migrations/010_subscriber_advisor.sql`.

Compila las cuatro interfaces y ejecuta desde la raíz:

```sh
node dev/preview-admin-collaboration.mjs
```

Abre `http://localhost:8898/`. La demo ejecuta las reglas de colaboración y
tutorial con datos en memoria. Ofrece perfiles PRO, un vinculado existente, una
cuenta nueva y una bandeja de correo simulada. No carga credenciales ni contacta
con bases de datos, Calendar o proveedores de correo. Reiniciar elimina solo
los cambios de la demo.
