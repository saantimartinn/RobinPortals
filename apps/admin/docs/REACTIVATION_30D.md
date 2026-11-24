# Reactivación de leads de Holanda · >30 días

## Alcance confirmado

Handoff: `robin_30d_holanda_handoff 2`, `IMPLEMENTACION.md` y `manifest.json`.
Las ocho plantillas HTML/texto se conservan en
`lib/lead-reactivation-templates.json`. El propietario confirmó el 24/11/2026:
incluir los leads actuales y futuros, usar `no-reply@project-robin.com`, recibir
respuestas en `hello@project-robin.com` y utilizar la aceptación del cuestionario
sin exigir un nuevo campo de consentimiento. No se inventan firmas individuales.

Campañas confirmadas como Holanda: Sociales - Video 15/09/2026, Webinar 10-10
Video y carrousel, Psico - Video 25/09/2026 y Campaña continua Candela. También
se reconocen destinos estructurados explícitos, Delft y las landings existentes
de Holanda. `area` identifica asignaturas, no un destino; notas ambiguas y país
de origen no bastan para inscribir.

El propietario también confirmó que los 36 registros actuales de >30 días son
de Holanda. Sus IDs se guardaron en una lista operativa privada local, fuera del
repositorio; 34 tienen correo válido y dos se excluyen. La activación carga esa
lista en `confirmed_holanda_lead_ids`. Esta excepción solo cubre esos IDs; los
futuros leads sin destino fiable no se clasifican por esa confirmación anterior.

## Entrada, calendario y salidas

El turno diario comienza a las **20:00 Europe/Madrid**, con días 0, 4, 9, 15,
22, 30, 39 y 49. Se reutiliza la bandeja pendiente sin asignar y su umbral
estricto de más de 30 días desde `source_created_at || created_at`. Tener un
contacto humano en `contact_at` o `crm_lead_calls` excluye al lead. Los envíos
automáticos nunca modifican esas fechas.

Se excluyen pruebas, correos inválidos, bajas/rebotes, clientes, leads cerrados,
reservas activas y otra secuencia comercial identificada. Una inscripción única
por campaña/lead y campaña/email evita repetir la serie, incluso si hay fichas
duplicadas previas. La comprobación se repite antes de cada envío.

El cron revisa cada cinco minutos el calendario web de `hello@` y Gmail. Una
reserva real se cruza por email normalizado; no se usan aperturas o clics. La
reserva actualiza **el mismo ID**, conserva captación/campaña y añade la marca
de Reservas → Retargeting. La web reconoce a los inscritos también en su
reservador habitual `/contacto/`. Ese ajuste está en el repositorio `Web-robin`,
`netlify/lib/crm-lead.mjs`, que escribe directamente en el CRM.

La fecha de la nueva reserva determina su antigüedad en la bandeja, sin cambiar
la fecha de captación de las métricas. Tras asignarlo, sigue el funcionamiento
habitual del CRM. Si vuelve a superar 30 días, no se reinscribe en los correos.

Respuesta del lead, correo manual del equipo, contacto registrado, asignación,
baja, rebote, conversión o cierre detienen los mensajes siguientes. Gmail solo
consulta listas de IDs; no descarga cuerpos de correo. Los mensajes automáticos
de esta campaña se envían por Resend, fuera de la carpeta Enviados de Gmail.

## Persistencia y seguridad

La migración `202611240001_create_lead_reactivation.sql` crea configuración,
inscripciones, mensajes y exclusiones en la **base administrativa**. Todas las
tablas tienen RLS sin acceso directo para anon/authenticated; sus RPCs son solo
de servicio. Instalarla deja `enabled=false` y no inscribe ni envía nada.

Los claims transaccionales y la clave `campaign/lead/message` impiden envíos
duplicados. El payload se congela en el primer intento. Una confirmación perdida
se puede recuperar con la misma clave durante 23 horas; después exige revisión,
sin reenvío automático. Los fallos no confirmados también exigen revisión. Un
retraso no comprime los intervalos entre piezas. El contador suma `sent_at`,
independientemente del correo de prueba.

Los eventos firmados de Resend identifican mensajes preexistentes mediante tags,
incluso si llegan antes de guardar la respuesta del API. No procesan correos de
otros productos. Entregas tardías no revierten un rebote. La baja usa un token
con audiencia propia: GET muestra confirmación y POST suprime el email; admite
`List-Unsubscribe-Post` y no da de baja por un escáner de enlaces.

## Revisión y activación

1. Revisar en local las ocho vistas previas y el historial de la ficha del lead.
   «Enviar prueba» solo permite `manuelvillamuriel@gmail.com`, sin inscripción
   ni contador. La primera prueba se envió el 24/11/2026, con asunto
   `[PRUEBA] ¿Seguimos con lo de Holanda?`; Resend confirmó su aceptación. Su
   enlace de baja es una página local de prueba, sin acciones sobre el CRM.
2. Publicar, tras aprobación, el código del portal y el pequeño ajuste de la web.
   Aplicar la migración en ADMIN_SUPABASE; revisar selección con envíos apagados.
3. Reautorizar la conexión Gmail existente con `gmail.readonly` además de los
   permisos actuales. No crear otra cuenta. El token actual solo permite envío;
   el worker se bloquea si no puede comprobar respuestas.
4. Configurar en Resend el webhook
   `https://project-robin.com/api/admin/crm/reactivation-events` para
   `email.delivered`, `email.bounced`, `email.complained`, `email.suppressed` y
   `email.failed`. Guardar su secreto en `RESEND_WEBHOOK_SECRET` del entorno Admin.
   El worker se bloquea si falta. Se mantiene la clave de envío actual, sin
   ampliar sus permisos para leer emails del proveedor.
5. Comprobar la baja publicada, la firma de los eventos y el acceso al calendario.
   Con aprobación del correo de prueba, activar explícitamente la fila de
   `crm_reactivation_settings` poniendo `enabled=true, activated_at=now()`.

El comando de operación es de solo lectura por defecto:

```sh
node scripts/lead-reactivation.mjs --cohort /ruta/privada/cohorte-confirmada.json
# Solo tras aprobar y completar las conexiones/publicación:
node scripts/lead-reactivation.mjs --cohort /ruta/privada/cohorte-confirmada.json --activate --approve-test
```

El archivo contiene `campaign_id`, `confirmed_at`, `confirmed_by` y `lead_ids`.
No versionar IDs ni datos de producción. El comando de activación comprueba
Gmail, calendario, configuración de eventos y la baja publicada antes de guardar
la configuración. No envía correos directamente.

El cron despacha un worker autenticado con JWT de cinco minutos: Netlify limita
los programados a 30 segundos; el worker de fondo permite revisar y enviar los
lotes sin ese corte. Los deploy previews no ejecutan envíos. Nunca configurar
`activated_at` ni activar desde una prueba local.

Pruebas: `npm test` en Admin y `node --test test/*.test.mjs` en Web-robin.
Las pruebas SQL usan PostgreSQL aislado con PGlite e integraciones externas
simuladas. No se ejecutan cobros, reservas ni correos reales desde los tests.

Referencias técnicas: [horarios y límites de Netlify](https://docs.netlify.com/build/functions/scheduled-functions/),
[idempotencia de Resend](https://resend.com/changelog/idempotency-keys),
[tags en eventos](https://resend.com/docs/dashboard/emails/tags) y
[consulta de mensajes Gmail](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list).
