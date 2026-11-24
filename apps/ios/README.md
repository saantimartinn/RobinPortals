# Robin iOS · prototipo nativo

Proyecto nativo SwiftUI con `WKWebView`. Abre el login existente de Robin y conserva sus rutas y cookies bajo un mismo origen. No está preparado para App Store.

## Portal de producción y estado del prototipo

El iPhone físico y la compilación Release abren [Portal del Alumno](https://project-robin.com/portal/). La compilación Debug para simulador conserva una configuración de desarrollo y no representa un despliegue público. El prototipo requiere Xcode y no debe presentarse como una app publicada.

El proyecto se genera desde `project.yml` con `xcodegen generate`. La app conserva las páginas de Portal, Robin Jr y Community en la misma ventana. Los enlaces externos, como pasarelas de pago, se abren fuera de la app y requieren una revisión completa antes de distribuirla.

## Contraseña y Face ID

En el portal, inicia sesión normalmente. Si el iPhone tiene Face ID configurado, Robin ofrecerá guardar esa contraseña en el llavero local. Al cerrar sesión, el login mostrará «Entrar con Face ID». La contraseña manual siempre se puede usar. Si cambias la contraseña desde el perfil, Robin actualiza la copia protegida del llavero.

El llavero usa la biometría configurada en ese iPhone. Cambiar el conjunto de rostros invalida la credencial protegida y habrá que volver a entrar con contraseña. Mientras la cookie de sesión siga vigente, el portal puede abrir directamente sin pedir Face ID: esta función agiliza un **nuevo inicio de sesión**, no bloquea cada apertura de la app.

El botón y el aviso de guardado viven en el frontend del portal. El iPhone físico abre la versión pública y solo los mostrará después de publicar esos cambios web y volver a ejecutar la compilación iOS. Para el estado de preparación para distribución, consulta [APP_STORE_READINESS.md](APP_STORE_READINESS.md).
