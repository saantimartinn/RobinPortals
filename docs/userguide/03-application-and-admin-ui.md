# 03 · Portal, onboarding y admin

## Flujo del alumno

`app.jsx` entrega `user`, refresh y logout a `PortalShell` (`ApplicationPortals.jsx`), que selecciona pantalla activa y subcomponentes de `ClientSections.jsx`. La interfaz presenta fase de expediente, perfil, pagos/facturas, carreras, documentos, reservas, chat-asistente y FAQs. Cada pantalla obtiene datos del cliente API y mantiene presentation/state; el servidor valida persistencia.

El onboarding se compone en `application/onboarding/OnboardingFlow.jsx` y delega el contenido de cada paso a módulos hermanos: `origin.jsx`, `dni.jsx`, `contract.jsx`, `profile.jsx`, `payment.jsx`, `questionnaire-fields.jsx` y `onboarding-shared.jsx`. Cambiar campos que se guardan requiere revisar API handler, schema/tables, contract/PDF si se repite en documento, y tests de onboarding.

## Superficie administrativa

`AdminPortal.jsx` compone el espacio de trabajo admin. Los submódulos en `application/admin/` implementan dashboard y utilities, gestión de usuarios/clientes, progreso, configuración académica, carreras, pagos, reservas, documentos, chat y notificaciones. `AdminWorkspace.jsx` proporciona el layout común, `admin-navigation.js` define items, `CrossPortalNav.jsx` conecta los tres productos.

`admin-permissions.js` expresa claves visibles. La Function correspondiente vuelve a comprobar admin/pro scope y el target user/record. En Robin Admin, `src/features/admin/settings.tsx` administra permisos expuestos; preservar compatibilidad de claves entre repos.

## API/servidor que apoya la UI

- Clientes/alumnos → `/api/admin/clients*`, `/api/profile*`, `/api/me`.
- Onboarding → `/api/onboarding/*`; firma, DNI/OCR, registro de origin y checkout tienen handlers separados.
- Carreras → `/api/careers`, `/api/admin/careers/*`, sugerencias IA.
- Documentos → upload ticket, upload, list/get, revisión admin.
- Pago → `/api/payments*`, checkout/verify e invoice PDF.
- Reservas y Meet → availability/create/list y calendar webhook.
- Chat/FAQ → `/api/chat`, `/api/admin/chat`, `/api/faqs`.

Para métodos, roles, errores y tablas detectadas, usar [API_INVENTORY](../API_INVENTORY.md), y para interacción por archivo [FILE_MAP](../FILE_MAP.md).
