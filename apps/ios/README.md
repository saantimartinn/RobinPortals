# Robin iOS · experiencia nativa

Aplicación SwiftUI con una pantalla nativa de inicio, una bandeja común de avisos y una sección de cuenta. Los flujos completos de Portal, Robin Jr y The Robin Plan siguen dentro de `WKWebView`, con sus sesiones y controles de acceso actuales. Esta implementación no implica que la app ya esté aprobada o lista para publicar en App Store.

Las pantallas nativas reutilizan el wordmark y los tres emblemas de producto de la web, junto a su paleta navy, dorado y crema. El selector superior de producto de la web se oculta dentro de la app: Inicio y el selector nativo son el punto para cambiar de producto. Dentro del Portal, «Mi camino», «Mis carreras» y el resto de secciones quedan fijadas en la parte superior de la vista web al desplazarse.

## Portal de producción y estado del prototipo

El iPhone físico y la compilación Release abren [Portal del Alumno](https://project-robin.com/portal/). La compilación Debug para simulador conserva una configuración de desarrollo y no representa un despliegue público. El prototipo requiere Xcode y no debe presentarse como una app publicada.

El proyecto se genera desde `project.yml` con `xcodegen generate`. Inicio solo muestra productos cuya sesión y acceso se confirman en su servidor. Se conserva el último producto abierto si sigue autorizado. Los enlaces externos, como pasarelas de pago, se abren fuera de la app y requieren una revisión completa antes de distribuirla.

La bandeja consulta cada producto por separado. Los endpoints `GET /api/notifications?native=1` devuelven como máximo 100 resúmenes sin el cuerpo del aviso. Abrir un aviso deja que su popup aplique el flujo actual; leerlo desde la bandeja no lo marca como visto ni acepta términos.

## Contraseña y Face ID

En el portal, inicia sesión normalmente. Si el iPhone tiene Face ID configurado, Robin ofrecerá guardar esa contraseña en el llavero local. Al cerrar sesión, el login mostrará «Entrar con Face ID». La contraseña manual siempre se puede usar. Si cambias la contraseña desde el perfil, Robin actualiza la copia protegida del llavero.

El llavero usa la biometría configurada en ese iPhone. Cambiar el conjunto de rostros invalida la credencial protegida y habrá que volver a entrar con contraseña. Mientras la cookie de sesión siga vigente, el portal puede abrir directamente sin pedir Face ID: esta función agiliza un **nuevo inicio de sesión**, no bloquea cada apertura de la app.

El botón y el aviso de guardado viven en el frontend del portal. El iPhone físico abre la versión pública y solo los mostrará después de publicar esos cambios web y volver a ejecutar la compilación iOS. Para el estado de preparación para distribución, consulta [APP_STORE_READINESS.md](APP_STORE_READINESS.md).

## Avisos del iPhone

La app registra un token APNs tras iniciar sesión y aceptar el permiso de avisos. El token se vincula por separado a Portal, Robin Jr y The Robin Plan cuando la cuenta tiene acceso a cada producto. Al cerrar sesión o revocar el permiso, se desactiva el token. Los avisos administrados en cada producto siguen apareciendo como popup y pueden enviarse al iPhone ahora o programarse con hora de Madrid. Tocar el aviso abre el producto y prioriza el popup correspondiente; los cambios de términos siguen requiriendo aceptación explícita.

Para activar el envío en producción:

1. Aplicar las migraciones `mobile_push_notifications` en los tres proyectos Supabase correspondientes.
2. Activar Push Notifications para el App ID `com.projectrobin.ios` en Apple Developer y firmar la app con ese perfil. El simulador solo verifica la compilación; probar la recepción con un iPhone físico.
3. Configurar en Netlify, para cada ámbito `PORTAL__`, `ROBINJR__` y `COMMUNITY__`, las variables `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID` y `APNS_ENVIRONMENT`. `APNS_PRIVATE_KEY` admite saltos de línea escritos como `\\n`. Usar `production` para TestFlight/App Store y `sandbox` para una compilación de desarrollo en iPhone.
4. Publicar el sitio y la app firmada. Las funciones programadas despachan cada cinco minutos; un aviso programado puede salir hasta cinco minutos después de la hora elegida.

La clave APNs queda solo en Netlify. El panel muestra cuántos dispositivos están registrados y el resultado aceptado/rechazado por APNs; la aceptación de APNs no confirma que iOS haya mostrado el aviso.

## Desarrollo

Desde `apps/ios`, ejecuta `xcodegen generate` para regenerar el proyecto. Las pruebas de navegación están en `RobinTests`.
