# Identidad

`subscribers.id` es la identidad estable y la referencia de relaciones, solicitudes,
mensajes y notificaciones. `username` y `email` son únicos; `lead_id` se conserva
por compatibilidad de acceso. El login consulta cada identificador mediante `eq`,
sin construir filtros PostgREST con la entrada del usuario.

Stripe mantiene `stripe_customer_id` y `stripe_subscription_id` en el suscriptor.
Usar un JWT_SECRET propio y un dominio separado evita compartir accidentalmente
sesiones con el portal de alumnos. El nombre de cookie conservado es `robin_session`.
