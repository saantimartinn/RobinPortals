# Inventario API

Generado desde Netlify y los handlers. Los controles por rol y ownership están en el código; una sesión no implica acceso a cualquier registro.

| Ruta | Handler | Métodos detectados | Acceso inicial |
|---|---|---|---|
| `/api/auth/login` | [auth-login](../backend/functions/auth-login.js) | POST | Público |
| `/api/auth/logout` | [auth-logout](../backend/functions/auth-logout.js) | POST | Público |
| `/api/auth/change-password` | [auth-change-password](../backend/functions/auth-change-password.js) | POST | Sesión suscriptor/admin |
| `/api/me` | [me](../backend/functions/me.js) | GET | Sesión suscriptor/admin |
| `/api/subscriber/signup` | [subscriber-signup](../backend/functions/subscriber-signup.js) | POST | Público |
| `/api/subscriber/cv-ai` | [subscriber-cv-ai](../backend/functions/subscriber-cv-ai.js) | POST | Sesión suscriptor/admin |
| `/api/subscriber/profile` | [subscriber-profile-update](../backend/functions/subscriber-profile-update.js) | POST | Sesión suscriptor/admin |
| `/api/subscription/checkout` | [subscription-checkout](../backend/functions/subscription-checkout.js) | POST | Sesión suscriptor/admin |
| `/api/subscription/plans` | [subscription-plans](../backend/functions/subscription-plans.js) | GET | Sesión suscriptor/admin |
| `/api/subscription/portal` | [subscription-portal](../backend/functions/subscription-portal.js) | POST | Sesión suscriptor/admin |
| `/api/subscription/discount` | [discount-validate](../backend/functions/discount-validate.js) | POST | Público |
| `/api/social` | [social](../backend/functions/social.js) | POST, GET | Sesión suscriptor/admin |
| `/api/messages` | [messages](../backend/functions/messages.js) | POST, GET | Sesión suscriptor/admin |
| `/api/challenges` | [challenges](../backend/functions/challenges.js) | POST, GET | Sesión suscriptor/admin |
| `/api/partners` | [partners-list](../backend/functions/partners-list.js) | GET | Sesión suscriptor/admin |
| `/api/community/events` | [community-events-list](../backend/functions/community-events-list.js) | GET | Sesión suscriptor/admin |
| `/api/community/rsvp` | [community-rsvp](../backend/functions/community-rsvp.js) | POST | Sesión suscriptor/admin |
| `/api/service-requests` | [service-requests](../backend/functions/service-requests.js) | GET, POST | Sesión suscriptor/admin |
| `/api/sub-admin/data` | [sub-admin-data](../backend/functions/sub-admin-data.js) | GET | Sesión suscriptor/admin |
| `/api/sub-admin/mutate` | [sub-admin-mutate](../backend/functions/sub-admin-mutate.js) | POST | Sesión suscriptor/admin |
| `/api/notifications/ack` | [notifications-ack](../backend/functions/notifications-ack.js) | POST | Sesión suscriptor/admin |
| `/api/notifications` | [notifications-list](../backend/functions/notifications-list.js) | GET | Sesión suscriptor/admin |
| `/api/stripe/webhook` | [stripe-webhook](../backend/functions/stripe-webhook.js) | POST | Firma Stripe |
