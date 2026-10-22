# Observabilidad

Netlify recoge errores de Functions. `webhook_log` registra eventos Stripe y correos
no enviados; no es una cola ni garantiza deduplicación. Supervisar códigos 5xx,
eventos pendientes de Stripe, errores de IA y fallos de envío de Resend.

No hay métricas ni alertas externas configuradas en este repositorio. Antes de
producción, definir responsables y umbrales sin registrar cuerpos completos o secretos.
