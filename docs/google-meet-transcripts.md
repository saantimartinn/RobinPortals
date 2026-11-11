# Transcripciones de llamadas

Portal del Alumno y Robin Jr guardan cada reunión en `public.meeting_transcripts`. La tabla conserva el texto original, el resumen, el alumno, la fecha y el estado de procesamiento. El campo `users.historial` sigue disponible y conserva el historial previo. Admin usa la base del Portal del Alumno.

## Autorizar las cuentas Google

Desde la raíz del repositorio, ejecuta `node dev/google-meet-authorize.mjs` y abre `http://127.0.0.1:9394` en el mismo ordenador. En Google Cloud, el cliente OAuth debe tener registrada esta URI de redirección exacta:

`http://127.0.0.1:9394/callback`

Autoriza por separado `noel@project-robin.com`, `manuel@project-robin.com` y `maria@project-robin.com`. El flujo comprueba la identidad y todos los permisos antes de guardar. Google exige los permisos `meetings.space.settings` y `meetings.space.readonly`, además de los permisos existentes de Calendar y lectura de Drive. La cuenta Workspace debe permitir la transcripción de Meet.

Las autorizaciones se guardan con permisos privados en `.netlify/google-meet-grants.json`, excluido de Git. No copies tokens en mensajes ni en archivos versionados.

Cuando estén autorizadas las tres cuentas, ejecuta `node dev/google-meet-authorize.mjs --apply`. Valida de nuevo cada cuenta y actualiza las variables de producción y los `.env` locales. Después realiza un nuevo despliegue: las funciones ya publicadas no reciben variables nuevas hasta desplegar.

## Procesamiento

- Solo Portal y Robin Jr deben tener `MEET_TRANSCRIPT_POLL_ENABLED=true`. Admin debe mantenerlo en `false` para no duplicar el colector de Portal.
- `MEET_AUTO_TRANSCRIBE_ENABLED=true` activa la configuración automática de transcripción al crear nuevas reservas. No modifica grabaciones ni notas inteligentes. Requiere la autorización anterior.
- La tarea programada solo despacha un worker en segundo plano. El worker descubre documentos de los últimos siete días, los encola y procesa lotes de cinco. `MEET_POLL_LOOKBACK_HOURS` permite ampliar la búsqueda hasta 90 días.
- Cada documento tiene una clave única y una reserva de procesamiento temporal. Las importaciones duplicadas no crean reuniones adicionales. Los errores se reintentan; tras ocho intentos hay que revisar la causa. Las llamadas sin una identidad inequívoca quedan en `unmatched`; no se asignan por cercanía de hora.
- Las notas añadidas manualmente y los webhooks usan el mismo historial. La IA resume únicamente la reunión nueva; la unión con el historial anterior es transaccional.

## Comprobación

`/portal/api/meet/health` y `/robinjr/api/meet/health` requieren el secreto de Meet. Informan de permisos, identidad Google, activación del colector, estados de la cola y última reunión completada. Una conexión Google correcta no demuestra que se haya procesado una llamada.

Para verificar el recorrido real, crea una reserva, comprueba que Meet muestra la transcripción activada, realiza una llamada y verifica el documento original y una única fila `completed` con resumen e historial actualizado. No confundir pruebas sintéticas con esta comprobación.
