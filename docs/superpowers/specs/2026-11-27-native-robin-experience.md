# Experiencia nativa de Robin para iPhone

## Objetivo

Dar a la app de iPhone una función útil propia además de mostrar los portales web. La persona debe poder entrar en Robin, cambiar de producto, revisar avisos y llegar a soporte desde una interfaz nativa. Los flujos completos de Portal, Robin Jr y The Robin Plan seguirán usando sus pantallas actuales dentro de WKWebView.

## Enfoque

Crear una capa nativa SwiftUI que actúe como inicio y centro de notificaciones; conservar WKWebView como contenedor de los flujos de producto. La sesión web existente es la fuente de identidad y permisos. No se guardarán ni combinarán cuentas en la app.

## Estructura

### 1. Inicio Robin

- Saludo con el nombre disponible y estado de sesión.
- Tarjetas para Portal del Alumno, Robin Jr y The Robin Plan solo cuando la cuenta tenga acceso.
- Acceso visible a avisos pendientes y soporte.
- Reanudar el último producto visitado si sigue autorizado; si no, mostrar el inicio.
- Estados de carga, desconexión y sesión vencida con acciones claras.

### 2. Bandeja de avisos

- Lista nativa de avisos pendientes y recientes, agrupada por producto y ordenada por fecha.
- Cada fila enseña título, producto, fecha y estado; no presenta datos sensibles en texto de pantalla bloqueada.
- Al tocar un aviso, abrir el producto de origen en WKWebView y seleccionar su identificador para que el popup web actual muestre el aviso correcto.
- Los avisos informativos se marcan como vistos únicamente con la acción actual del usuario.
- Los avisos de términos abren el flujo existente y requieren aceptación expresa. La bandeja nunca acepta por el usuario.
- El contador del icono refleja los avisos pendientes que la cuenta puede consultar.

### 3. Cuenta y ayuda

- Identidad y producto activo, cerrar sesión, recargar sesión y abrir la política de privacidad.
- Acción nativa para abrir el formulario web existente de reportar un problema.
- Estado del permiso de notificaciones y enlace a Ajustes de iOS cuando el usuario lo haya denegado.
- No incluir eliminación de cuenta en este alcance: requiere definir retención de contratos, facturas y obligaciones legales. Debe resolverse antes de App Store si se permite crear cuentas desde la app.

## Navegación e interacción

- La barra inferior nativa tiene **Inicio**, **Avisos** y **Cuenta**.
- Al seleccionar un producto, la app abre su URL autorizada dentro del WKWebView; el selector nativo permite volver a Inicio y cambiar a otro producto.
- Cada apertura valida la sesión y permisos en servidor. No se confía en una lista de productos guardada localmente.
- Los enlaces externos y pasarelas mantienen el comportamiento actual de abrir fuera de la app.
- Una notificación push tocada abre el producto correspondiente; si la sesión venció, el usuario inicia sesión y luego llega al aviso.

## Datos y servicios

- El Portal es el punto de validación de la sesión compartida; cada producto conserva sus propios endpoints y autorización.
- Para la bandeja se consultan los avisos disponibles en Portal, Robin Jr y Community con sus cookies actuales. Una cuenta puede no existir en los tres productos; los errores de producto no bloquean los otros resultados.
- Los identificadores de producto y aviso se validan antes de construir una URL interna.
- El contenido sensible completo solo se carga dentro del producto autenticado, no desde una respuesta agregada que pueda cruzar permisos.
- Los callbacks push actuales registran el dispositivo y solicitan permiso después de validar al usuario.

## Accesibilidad y estados

- Compatibilidad con Dynamic Type, VoiceOver, contraste del sistema y áreas seguras del iPhone.
- Indicadores claros para sin avisos, carga, error de red, sesión caducada y permiso denegado.
- La app conserva acceso por contraseña cuando Face ID o Touch ID no están disponibles.

## Fuera de alcance

- Sustituir todos los portales por pantallas SwiftUI nativas.
- Modo offline para documentos, contratos, DNI o pagos.
- Crear cuentas, firmar contratos o aceptar términos en la bandeja.
- Android, widgets y Live Activities.
- Eliminar la cuenta directamente desde iOS hasta definir el flujo y retención legal.

## Riesgo de App Store

El inicio nativo, la bandeja y la cuenta hacen la utilidad móvil más visible, pero Apple evalúa la app completa y puede considerar insuficiente una app cuyo contenido principal sigue siendo web. No se debe afirmar que el diseño garantiza aprobación. Antes de enviar, revisar la regla 4.2, la eliminación de cuentas, privacidad, pagos, acceso de revisión y calidad en dispositivo.

## Criterios de aceptación

1. Tras autenticarse, aparece Inicio nativo con solo los productos autorizados.
2. El usuario puede cambiar entre Inicio, Avisos y Cuenta sin perder una sesión válida.
3. Un aviso recibido por push abre el aviso correcto en su producto, incluso tras autenticar una sesión vencida.
4. Los avisos informativos y de términos conservan sus acciones y autorizaciones actuales.
5. Un fallo consultando un producto no oculta avisos de los otros productos.
6. No aparecen datos de una cuenta distinta ni datos sensibles en la bandeja o en notificaciones push.
7. Reportar un problema, cerrar sesión y volver con biometría continúan disponibles.

## Decisiones para confirmar

- Inicio nativo y bandeja común son la primera fase de una experiencia nativa gradual.
- Los portales siguen siendo web para tareas extensas.
- La bandeja puede consolidar solo el título, producto, fecha, estado e identificador; el cuerpo se abre en el portal.
- La eliminación de cuenta y las funciones offline requieren una decisión y un diseño propios antes del envío a revisión.
