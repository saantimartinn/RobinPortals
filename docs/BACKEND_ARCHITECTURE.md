# Arquitectura backend

`backend/functions/` contiene adaptadores HTTP de Netlify con `exports.handler`.
`backend/lib/` contiene las dependencias reutilizables. Un handler no importa otro
handler: el validador de descuentos vive en `lib/discounts.js`.

| Módulo | Responsabilidad |
|---|---|
| auth / principal | bcrypt, JWT, cookie y roles de suscripción |
| http | JSON, métodos, Origin y errores |
| supabase | Cliente con service role, solo servidor |
| stripe | SDK, URL de retorno y dispatch exclusivo de suscripciones |
| subscription | Planes y sincronización de estado Stripe |
| discounts | Consulta de códigos válidos |
| social | Relaciones de amistad |
| anthropic-chat | Llamada al proveedor de IA |
| email | Envío con Resend o registro de no envío |

Los endpoints conservan parte de su lógica de dominio para evitar una reescritura
innecesaria. La separación no convierte todos los handlers en controladores mínimos.
Se eliminaron las ramas de cuotas, onboarding, facturas Holded, Google y Zoom.
