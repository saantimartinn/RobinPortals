# Avisos del panel de Portal en iPhone

## Intención

Los administradores seguirán redactando avisos en **Portal → Notificaciones**. El aviso informativo conservará el popup actual; las cuentas con la app iOS instalada y permiso para recibir avisos obtendrán además una notificación del iPhone, incluso con la app cerrada. Se podrán enviar en el momento o programar para una fecha y hora.

## Alcance

- En la pantalla actual, elegir clientes concretos, un grupo por producto (Portal, Robin Jr o The Robin Plan) o todos los clientes con la app instalada. Mostrar antes de confirmar el número de destinatarios y de dispositivos elegibles, sin prometer entrega de APNs.
- Los envíos programados usarán fecha y hora de Madrid en la interfaz; el servidor guardará UTC y resolverá la audiencia en el momento del envío. Un admin podrá ver el estado y cancelar un envío pendiente. El texto y los criterios quedan fijos tras programarlo.
- El aviso será un registro duradero para la cuenta, con identificador único y estado por destinatario. Los destinatarios con varios productos o iPhones recibirán un aviso por dispositivo, sin registros duplicados para la misma persona. El popup actual seguirá apareciendo en el producto correspondiente cuando la persona entre; abrir el push llevará al aviso dentro de la app, sin marcarlo como visto automáticamente.
- La app solicitará permiso de avisos en un momento contextual tras iniciar sesión, registrará y actualizará el token APNs con una petición autenticada al servidor y lo desvinculará de la cuenta al cerrar sesión o cambiar de usuario. El servidor invalidará los tokens que APNs rechace como caducados. La app ofrecerá un historial sencillo de avisos y un acceso a los ajustes de notificaciones.
- El servidor de Portal será el punto de creación y programación. Resolverá la identidad de Portal, Robin Jr y The Robin Plan en el servidor; no aceptará del cliente una identidad o pertenencia a producto sin comprobar. Las claves APNs y de base de datos estarán solo en el servidor. La tabla de dispositivos y el historial tendrán acceso restringido.
- Un trabajador periódico tomará únicamente envíos vencidos mediante un claim atómico, preparará los destinatarios, guardará el resultado por dispositivo y enviará a APNs. Los errores temporales se reintentarán sin reenviar los ya aceptados por APNs; una respuesta ambigua quedará para revisión y evitará un duplicado automático. Se distinguirá «aceptado por APNs» de «visto por el cliente».
- Los cambios de términos conservarán su aceptación expresa y correo actuales. Si se les añade push, el texto móvil solo invitará a abrir el aviso; el push nunca contará como aceptación.

## Fuera de alcance

- Android y notificaciones web.
- Campañas automáticas por cumpleaños, pagos u otros eventos; en esta versión el admin redacta y programa cada aviso.
- Garantizar que iOS muestre cada push: el permiso, el estado del dispositivo y APNs condicionan la entrega.
- Envío de datos sensibles (DNI, importes, detalles contractuales) en la pantalla bloqueada. El push contendrá título y un resumen seguro; el contenido completo se verá tras autenticarse.

## Alternativas consideradas

1. **Ampliar Portal → Notificaciones y añadir un servicio único de distribución (elegida):** conserva el flujo de trabajo conocido y permite programar, segmentar y deduplicar entre productos. Requiere un registro común de instalaciones e identidad.
2. **Duplicar el envío push en las tres bases de datos de producto:** aprovecha tablas existentes, pero el admin tendría que gestionar listas y resultados separados, y un cliente de varios productos podría recibir avisos duplicados.
3. **Usar un proveedor externo de campañas móviles:** simplifica algunas funciones de envío, pero introduce otra base de audiencias y datos personales y deja la sincronización con el popup a cargo de Robin.

## Decisiones de implementación

- Usar APNs para iOS. El proyecto nativo actual es SwiftUI con `WKWebView` y aún no tiene registro de notificaciones. Apple exige activar la capacidad Push Notifications y registrar la app para obtener un token de dispositivo: <https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns>.
- Mantener el popup como fuente visible del aviso en Portal, Robin Jr y The Robin Plan. Para clientes con identidad externa al Portal, el distribuidor también escribirá en el almacén de notificaciones del producto correspondiente; el registro común conserva la relación entre persona, producto e instalación. La deduplicación dependerá de vínculos de cuenta comprobados por el servidor, nunca solo de coincidir en un email.
- El botón actual de envío pasará a confirmar «enviar ahora» o «programar». Ningún aviso existente se reenviará a móviles por instalar la nueva versión.
- Antes de publicar, configurar la capacidad y credenciales APNs para el identificador `com.projectrobin.ios`, aplicar las migraciones y probar en un iPhone real. El simulador y una compilación local por sí solos no verifican la recepción en un dispositivo físico.

## Criterios de aceptación

1. Un aviso informativo inmediato enviado desde la pantalla actual aparece como push en un iPhone autorizado y como popup al entrar; se registra una sola vez para el cliente.
2. Una selección de persona, producto o todos los instalados no incluye cuentas ajenas al criterio; un cliente presente en dos productos no recibe duplicados en el mismo dispositivo.
3. Un aviso programado no sale antes de la hora elegida, puede cancelarse antes del claim y registra los resultados por destinatario y dispositivo.
4. Sin permiso, con sesión cerrada o con token inválido no se envía push a ese dispositivo; el popup pendiente permanece accesible para la cuenta.
5. Un push abierto conduce al aviso correcto tras autenticarse. Marcarlo visto o aceptar términos exige la acción existente en la app.
