# Robin iOS · prototipo local

Proyecto nativo SwiftUI con `WKWebView`. Abre el login existente de Robin y conserva sus rutas y cookies bajo un mismo origen. No está preparado para App Store.

## Ejecutar en el simulador

1. Arranca el servidor desde la raíz del repositorio con `npm run dev`.
2. Abre `Robin.xcodeproj` en Xcode.
3. Selecciona un simulador de iPhone y pulsa **Run**.

La compilación Debug para el simulador abre `http://localhost:8888/portal/`. En un iPhone físico y en Release abre `https://project-robin.com/portal/`. Los cambios locales de la web solo se ven en el simulador mientras el servidor local está activo.

El proyecto se genera desde `project.yml` con `xcodegen generate`. La app conserva las páginas de Portal, Robin Jr y Community en la misma ventana. Los enlaces externos, como pasarelas de pago, se abren fuera de la app y requieren una revisión completa antes de distribuirla.
