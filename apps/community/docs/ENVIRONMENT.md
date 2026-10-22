# Entorno

La lista completa sin valores está en `.env.example`. No guardar secretos en Git
ni en variables `VITE_*`. En Netlify, configurar secretos para Functions/runtime.

| Variables | Uso |
|---|---|
| SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | Base independiente; obligatorias para datos |
| JWT_SECRET | Secreto aleatorio exclusivo de este portal para sesiones |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | Checkout y firma de webhook |
| STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL | Opcionales; Price IDs recurrentes en Stripe |
| PORTAL_SUPABASE_URL, PORTAL_SUPABASE_SERVICE_ROLE_KEY | Lectura servidor del portal principal para vincular al pagador |
| HOLDED_API_PAT | Token servidor para crear facturas de suscripción en Holded |
| HOLDED_ACCOUNT_SUBSCRIPTIONS, HOLDED_ACCOUNT_GENERAL | Cuenta contable de suscripciones y fallback |
| PUBLIC_BASE_URL | URL canónica de retorno de Stripe |
| ALLOWED_ORIGINS | Orígenes adicionales separados por comas |
| ANTHROPIC_API_KEY, ANTHROPIC_MODEL | CV con IA; modelo opcional |
| RESEND_API_KEY, RESEND_FROM | Correo transaccional |
| URL, DEPLOY_PRIME_URL, DEPLOY_URL, CONTEXT | Variables del entorno Netlify |
| ADMIN_EMAIL, ADMIN_PASSWORD | Solo script manual de creación de admin |

Sin Stripe, los endpoints correspondientes devuelven indisponibilidad. Sin Resend,
se registra `not_sent` y no existe cola de reenvío. Sin Anthropic, el CV IA no funciona.
No hacen falta variables de Google, Zoom ni buckets de DNI. Holded y la conexión
servidor al portal sólo son necesarias para emitir facturas; si faltan, el cobro y
la activación siguen funcionando y la factura queda marcada como no generada.
