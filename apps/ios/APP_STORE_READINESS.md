# Robin iOS: preparación para App Store

Estado revisado el 4 de noviembre de 2026. Este documento sigue la app iOS de `apps/ios` y el portal que muestra en `WKWebView`. Hay que volver a contrastarlo con las normas vigentes antes de enviar una versión.

## Preparado en local

- Proyecto SwiftUI con `WKWebView`, identificador de paquete e icono de 1024 × 1024 píxeles.
- Descripciones de permiso para cámara y Face ID en `Info.plist`. El portal ofrece cámara al fotografiar el DNI y mantiene la selección de imágenes existente.
- Guardado opcional de la contraseña en el llavero de **este dispositivo**, protegido por el conjunto actual de biometría; requiere que el iPhone tenga código de bloqueo. La app nunca guarda la contraseña en `UserDefaults`; allí solo almacena el nombre de usuario para saber si debe ofrecer Face ID. El inicio manual sigue disponible.
- `PrivacyInfo.xcprivacy` declara el uso de `UserDefaults` con la razón `CA92.1`, correspondiente a preferencias accesibles solo para la app. [Apple: API de razón obligatoria](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api).
- Enlaces a la política de privacidad desde el login y el perfil del alumno. La política existente está en `/admin/politica-de-privacidad.html`.

La interfaz web de guardado y Face ID todavía es un cambio **local**. En el iPhone físico la app carga `https://project-robin.com/portal/`; habrá que publicar el portal para que aparezca esa interfaz. La compilación nativa nueva también se debe instalar desde Xcode.

## Pendiente antes de distribuir

| Área | Qué falta comprobar o completar | Fuente de Apple |
| --- | --- | --- |
| Funcionalidad propia | La app sigue siendo principalmente una web integrada. Evaluar y añadir utilidad nativa duradera; Face ID y cámara pueden ayudar, pero no garantizan la aprobación. | [Norma 4.2](https://developer.apple.com/app-store/review/guidelines/) |
| Privacidad | Revisar jurídicamente la política existente: el portal trata DNI/pasaporte, contratos, pagos y datos del alumno, que deben quedar explicados con precisión. Completar la URL pública de la política en App Store Connect y la declaración de datos recopilados, incluidos los del tráfico en la vista web. | [Norma 5.1](https://developer.apple.com/app-store/review/guidelines/), [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) |
| Eliminación de cuenta | Si se puede crear una cuenta desde la app, ofrecer dentro de ella un camino claro para iniciar su eliminación. Hoy no hay un flujo de eliminación verificado en el portal. Diseñar el proceso de confirmación y conservación legal de contratos/facturas antes de implementarlo. | [Apple: eliminación de cuenta](https://developer.apple.com/support/offering-account-deletion-in-your-app/) |
| Autocompletar de iCloud | Para que Contraseñas de Apple sugiera y guarde credenciales del dominio como sistema, añadir `webcredentials:` en Associated Domains y servir `apple-app-site-association` por HTTPS sin redirecciones en cada dominio usado. Este paso exige configurar el App ID y publicar el archivo; el llavero protegido de Robin no depende de él. | [Password AutoFill](https://developer.apple.com/documentation/security/about-the-password-autofill-workflow), [dominios asociados](https://developer.apple.com/documentation/Xcode/supporting-associated-domains) |
| Pagos y enlaces externos | Revisar cada pago y salida del `WKWebView` según lo que se compra y la norma aplicable de compras dentro de la app. Probar el retorno desde la pasarela al iPhone. | [Norma 3.1](https://developer.apple.com/app-store/review/guidelines/) |
| Revisión de Apple | Preparar cuenta de demostración con todas las pantallas accesibles, instrucciones para probar DNI/pagos y backend activo. Probar cámara, Face ID, recuperación de contraseña, salida/entrada, enlaces y errores de red en un iPhone real. | [Antes de enviar y norma 2.1](https://developer.apple.com/app-store/review/guidelines/) |
| Ficha de App Store | Completar nombre, descripción, categoría, clasificación por edades, capturas, contacto y datos de privacidad en App Store Connect. Ninguno de esos metadatos se obtiene de este repositorio. | [App Store Connect](https://developer.apple.com/help/app-store-connect/manage-app-information/) |
| Cuenta de desarrollador | Verificar que el equipo de firma tiene una membresía activa del Apple Developer Program y acceso a App Store Connect; poder ejecutar la app desde Xcode no demuestra que ya pueda distribuirse. | [Apple Developer Program](https://developer.apple.com/help/account/membership/programs-overview) |
| Menores y acceso | Revisar la edad real de los alumnos y las funciones de Robin Jr al elegir categoría y clasificación. El login propio actual no obliga por sí solo a ofrecer otro proveedor de inicio de sesión; reevaluar si se añade login social. | [Normas 1.3, 2.3.6 y 4.8](https://developer.apple.com/app-store/review/guidelines/) |

No se han activado capacidades de dominios asociados ni se ha publicado nada. Añadir la capacidad antes de que el dominio sirva su archivo de asociación puede romper la firma o dejar el autocompletado sin funcionar.
