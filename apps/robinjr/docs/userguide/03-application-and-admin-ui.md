# 03 · Portal, onboarding y admin

## Flujo del alumno

`app.jsx` entrega `user`, refresh y logout a `PortalShell` (`ApplicationPortals.jsx`), que selecciona pantalla activa y subcomponentes de `ClientSections.jsx`. El alumno ve Mi camino (nueve fases), Mis carreras (tarjetas asignadas con detalle en popup), Mi plan (calendario de reservas y deadlines), documentos y pagos. Cada pantalla obtiene datos del cliente API y mantiene presentation/state; el servidor valida persistencia.

El onboarding se compone en `application/onboarding/OnboardingFlow.jsx` y delega el contenido de cada paso a módulos hermanos: `origin.jsx`, `dni.jsx`, `contract.jsx`, `profile.jsx`, `payment.jsx`, `questionnaire-fields.jsx` y `onboarding-shared.jsx`. Cambiar campos que se guardan requiere revisar API handler, schema/tables, contract/PDF si se repite en documento, y tests de onboarding.

## Superficie administrativa

`AdminPortal.jsx` compone el espacio de trabajo admin. Los submódulos en `application/admin/` implementan dashboard y utilities, gestión de usuarios/clientes, progreso, configuración académica, carreras, pagos, reservas, documentos, chat y notificaciones. Para cada alumno se puede crear una ficha de carrera (foto, descripción, asignaturas y requisitos) y asignarla. Las fechas límite se fijan en documentos, no en la ficha de carrera. `AdminWorkspace.jsx` proporciona el layout común y `admin-navigation.js` define items.

El plan de Robin Jr contiene tres pagos (500 €, 500 € y 499,99 €). La segunda cuota se
puede habilitar cuando el alumno alcanza la fase 6 y la última al llegar a Wrap up (fase 9).
La secuencia exacta está en `application-steps.js` y las reglas backend en el handler de
desbloqueo de pagos.

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


## Seguir un flujo de aplicación/adminSeguir un flujo de aplicación/admin

Separa el flujo de solicitante/alumno del flujo de operador. Aunque compartan componentes visuales o datos, los roles, ownership y operaciones permitidas pueden diferir. Localiza primero la pantalla bajo `portal-source/src/features/`; sigue su composición y callbacks hasta el cliente API. Busca después el endpoint correspondiente y su guard server-side.

Para una nueva acción administrativa confirma: en qué shell aparece, qué capability la habilita, qué registros puede afectar, qué validación de campo se aplica, y qué handler vuelve a autorizar la operación. Para un paso de onboarding confirma transiciones de estado, navegación al volver atrás, persistencia parcial y mensajes de recuperación si falla una integración.

Al cambiar componentes compartidos, verifica al menos un consumidor cliente y uno admin. No extraigas código al directorio shared si contiene imports de Node, credenciales o reglas que solo el servidor puede hacer cumplir.

---

**USERGUIDE:** [Índice](../../USERGUIDE.md) · [← Anterior](./02-client-frontend.md) · [Siguiente documento de lectura →](./04-api-functions-and-services.md) · [READMELONG](../../READMELONG.md)
