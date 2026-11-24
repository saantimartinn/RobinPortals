# 03 · Portal, onboarding y admin

## Flujo del alumno

`app.jsx` entrega `user`, refresh y logout a `PortalShell` (`ApplicationPortals.jsx`), que selecciona pantalla activa y subcomponentes de `ClientSections.jsx`. La interfaz presenta fase de expediente, perfil, pagos/facturas, carreras, documentos, reservas, chat-asistente y FAQs. Cada pantalla obtiene datos del cliente API y mantiene presentation/state; el servidor valida persistencia.

El onboarding se compone en `application/onboarding/OnboardingFlow.jsx` y delega el contenido de cada paso a módulos hermanos: `origin.jsx`, `dni.jsx`, `contract.jsx`, `profile.jsx`, `payment.jsx`, `questionnaire-fields.jsx` y `onboarding-shared.jsx`. Cambiar campos que se guardan requiere revisar API handler, schema/tables, contract/PDF si se repite en documento, y tests de onboarding.

## Idioma del cliente

El acceso común, el onboarding y las pantallas del cliente ofrecen el selector **ESPAÑOL / INGLÉS**. La preferencia se guarda en `robin_language` y se comparte entre Portal, Robin Jr y Community en el mismo navegador. El cambio actualiza textos, fechas e importes sin reiniciar formularios. Las pantallas administrativas permanecen en español.

Las traducciones, los placeholders y la suscripción React viven en `packages/i18n/`. No se traducen valores persistidos del cuestionario, nombres ni mensajes escritos por usuarios. Los contratos se traducen al mostrarse; el documento canónico generado por el servidor conserva su contenido original.

## Superficie administrativa

`AdminPortal.jsx` compone el espacio de trabajo admin. Los submódulos en `application/admin/` implementan dashboard y utilities, gestión de usuarios/clientes, progreso, configuración académica, carreras, pagos, reservas, documentos, chat y notificaciones. `AdminWorkspace.jsx` proporciona el layout común, `admin-navigation.js` define items, `CrossPortalNav.jsx` conecta los tres productos.

Para `tipo = llegada`, `adminClientSections` limita la ficha a **Pack Llegada, Perfil, Pagos y Llamadas**, también antes de firmar. `AdminArrivalSummary.jsx` muestra el estado del servicio y las cuatro etapas reales del onboarding, sin cuestionario académico. Carreras, Documentos, Chat del alumno, Perfil académico y fases de admisión quedan fuera de esta ficha; al cambiar desde otra sección o producto se vuelve al resumen del pack. Los demás tipos conservan sus módulos. Las listas de clientes devuelven los indicadores reales de contrato y onboarding, y el backend rechaza asignar fases de admisión a Llegada. Estos clientes siguen contando en los resúmenes financieros y de cartera, pero no en fases, alertas de documentos ni cuellos de botella de admisión.

`admin-permissions.js` expresa claves visibles. La Function correspondiente vuelve a comprobar admin/pro scope y el target user/record. En Robin Admin, `src/features/admin/settings.tsx` administra permisos expuestos; preservar compatibilidad de claves entre repos.

Una ficha de cliente de tipo Mentoría muestra **Convertir a cliente** tras pagar
la cuota única de 666,33 €. `ConvertMentoria.jsx` ofrece General, Delft o Llegada;
`admin-clients.js` envía la acción al backend y `AdminPortal.jsx` recarga la lista.
El alumno vuelve al contrato para aceptar el nuevo programa. En General estándar,
el crédito cubre la primera cuota y el flujo omite el checkout. Véase
[Mentoría y conversión](../MENTORIA_CONVERSION.md).

## API/servidor que apoya la UI

En pagos extra, las clases de inglés/IELTS admiten una cantidad entera de horas mayor que cero, introducida por el asesor. El total se actualiza al cambiar cantidad o modalidad: 33 €/hora individual y 16,50 €/hora en grupo, exento de IVA. El backend vuelve a validar la cantidad y calcular el importe antes de crear el pago.

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
