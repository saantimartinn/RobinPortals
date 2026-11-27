# Notificaciones iOS desde cada producto

## Objetivo

Los administradores seguirán enviando avisos desde la sección **Notificaciones** de cada producto: Portal, Robin Jr y The Robin Plan. Estas tres secciones ya existen. Al crear un aviso, el cliente seguirá viendo el popup actual; si tiene la app iOS instalada y ha permitido las notificaciones, recibirá además un aviso del iPhone. Cada panel se limita a sus propios clientes. El admin puede enviar ahora o programar una fecha y hora.

## Alcance

- Extender las tres pantallas existentes. Portal y Robin Jr mantienen «Mis clientes» y «Todos» con selección individual; The Robin Plan mantiene «Todos» y «Seleccionar». Se añade en cada una la opción «Todos con la app instalada» y «Enviar ahora / Programar». El admin ve el número de clientes y de dispositivos elegibles antes de confirmar.
- El aviso creado pertenece solo al producto desde cuyo panel se envió. Su popup y su estado de lectura siguen en la base de ese producto. Un cliente que use varios productos puede recibir un aviso diferente de cada uno; una publicación concreta no se duplica en el mismo iPhone.
- La programación usa Europe/Madrid en la interfaz y UTC en almacenamiento. El texto, tipo y criterio de audiencia quedan fijados al programar; la lista concreta de destinatarios se resuelve al ejecutar el envío, para incluir solo cuentas vigentes y dispositivos registrados en ese momento. Un admin puede cancelar un envío pendiente.
- La app iOS pide permiso en un contexto posterior al inicio de sesión, registra y actualiza su token APNs con una petición autenticada y lo desvincula de la cuenta al cerrar sesión o cambiar de usuario. El servidor comprueba a qué productos tiene acceso cada cuenta; nunca confía en un `user_id` o producto aportado por el teléfono. Las claves de APNs y de Supabase permanecen solo en el servidor.
- Un mecanismo compartido de envío APNs y registro de dispositivos evita mantener tres implementaciones nativas. Cada producto conserva su propia autorización, sus notificaciones y su cola programada. El worker reclama envíos vencidos de forma atómica, guarda un resultado por dispositivo y no reintenta automáticamente las respuestas ambiguas que podrían duplicar el aviso.
- El push lleva un título y un resumen seguro, más el identificador y producto del aviso. Al tocarlo, la app abre el producto y el aviso correcto después de autenticar al cliente. Abrirlo no marca el popup como leído.
- El panel diferencia «programado», «enviado a APNs», «fallido» y «visto/aceptado». Que APNs acepte el mensaje no garantiza que iOS lo muestre.
- Los avisos de cambio de términos conservan la aceptación expresa y el correo existentes. El push de ese tipo solo invita a abrir el aviso y no cuenta como aceptación.

## Fuera de alcance

- Android y notificaciones web.
- Campañas automáticas por cumpleaños, pagos u otros eventos: el admin redacta cada aviso.
- Enviar DNI, importes o detalles contractuales a la pantalla bloqueada.
- Reenviar avisos antiguos al instalar la nueva versión.

## Enfoques considerados

1. **Ampliar las tres secciones existentes, con un módulo técnico compartido para iOS (elegido):** respeta los equipos y las audiencias de cada producto y conserva los popups actuales. El trabajo de APNs se reutiliza entre productos.
2. **Un único panel de notificaciones para todos los productos:** facilita campañas cruzadas, pero mezcla destinatarios y responsabilidades que el usuario quiere mantener en cada producto.
3. **Tres sistemas de push independientes:** evita dependencias compartidas, pero triplica el registro de dispositivos, las credenciales y las correcciones de entrega.

## Implementación y verificación

- La app actual es SwiftUI con `WKWebView` y carece de registro push. Se activará Push Notifications para `com.projectrobin.ios`; Apple requiere obtener y entregar al servidor un token de dispositivo: <https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns>.
- El registro común relacionará el dispositivo con identidades de producto verificadas mediante el acceso existente. No se fusionarán cuentas por coincidencia de email. Al perder acceso a un producto, ese vínculo se retirará antes de enviar nuevos avisos.
- Las migraciones de cada producto protegerán la cola programada y los resultados de envío con RLS y acceso de servidor. Se configurarán credenciales APNs fuera del repositorio.
- Se probarán selección individual, «todos», «todos con app», programación, cancelación, ausencia de permiso, cambio de cuenta y token inválido. La recepción real se comprobará en un iPhone físico con APNs configurado.

## Criterios de aceptación

1. Desde cada panel, un aviso inmediato llega como popup a sus clientes y como push a los dispositivos elegibles.
2. Los tres paneles no ofrecen destinatarios de otros productos. «Todos con la app» excluye los que no tienen un dispositivo vigente y autorizado.
3. Un aviso programado no sale antes de la hora elegida, puede cancelarse antes de ejecutarse y muestra su estado en el panel.
4. El mismo aviso no se envía dos veces al mismo dispositivo; un error de APNs no elimina el popup.
5. El push abre el aviso del producto correcto tras autenticarse. La lectura y la aceptación exigen la acción existente.
