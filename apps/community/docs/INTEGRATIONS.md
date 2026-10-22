# Integraciones

| Proveedor | Uso | Límite de confianza |
|---|---|---|
| Supabase | Persistencia PostgreSQL | Service role solo en backend |
| Stripe | Checkout, portal y suscripciones | Firma de webhook antes de escritura |
| Anthropic | Extracción/redacción de CV | Contenido del usuario enviado desde backend |
| Resend | Correos de solicitudes/aceptaciones | Envío best-effort; no es una cola |

El checkout solo procesa metadata `kind=subscription`, mode `subscription` y estado
de pago `paid` o `no_payment_required`. Las cuotas del portal de alumnos se ignoran.
Se conserva API Stripe `2024-06-20`; validar compatibilidad antes de actualizar el SDK.

Eventos: checkout.session.completed, checkout.session.async_payment_succeeded,
customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed.
El webhook propaga fallos de escritura con 500; no garantiza orden global de eventos.
