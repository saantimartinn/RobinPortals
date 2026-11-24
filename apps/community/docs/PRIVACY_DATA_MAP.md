# Datos personales

Supabase contiene identidad, email, ciudad, perfil, relaciones sociales, mensajes,
solicitudes, retos y estado de suscripción. El hash bcrypt no debe salir en APIs.
Stripe recibe datos de pago en su propia interfaz, no campos de tarjeta en React.
CV con IA envía al proveedor Anthropic el contenido necesario del documento/perfil.
Resend procesa destinatarios y contenido de correo transaccional.

No se incluyen exports de suscriptores, avatares ni filas históricas del CRM en Git;
consulta la [nota sobre métricas](../../admin/docs/crm-historical-metrics.md). El código
usa el bucket privado `community-private-images` de Supabase Storage para los avatares
de suscriptores y las fotos de mentores, y entrega URLs firmadas a miembros autenticados.
La migración de esquema y el backfill deben aplicarse al proyecto Community antes de
desplegar el flujo nuevo; los valores data URL
existentes permanecen en la base hasta completar el backfill. Establecer retención y
borrado de mensajes, CV y logs antes de producción. El
fallback de email registra solo etiqueta, pero otros logs heredados requieren revisión específica.
