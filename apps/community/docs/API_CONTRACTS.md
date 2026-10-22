# Contratos API

El [inventario generado](API_INVENTORY.md) recoge todas las rutas y handlers.
Las solicitudes usan el mismo origen y cookies; el frontend nunca lee el JWT.

| Flujo | Entrada principal | Respuesta relevante |
|---|---|---|
| Login | username, password | ok, user; cookie de sesión |
| Alta | name, email, password, ciudad, discount_code, tc_accepted | ok, user; cookie |
| Perfil | GET /api/me | Identidad, perfil y estado de suscripción sin hash |
| Checkout | plan: monthly o annual | URL alojada por Stripe |
| Customer Portal | POST sin datos de tarjeta | URL alojada por Stripe |
| Mensaje | to, body | Resultado según handler; requiere amistad |
| Reto | action=submit, challenge_id, answers, files | Resultado de envío |
| Admin mutate | entity, action, payload | Resultado de mutación; rol admin |

Convenciones generales: JSON, 400 para validación, 401 sin sesión, 403 por rol/origen,
405 para método no soportado y 500 para fallo del servidor. Algunos handlers conservan
respuestas específicas; el código es la fuente del contrato detallado.

El webhook usa body crudo/base64 y firma Stripe; no requiere cookie ni Origin.
Un error de persistencia devuelve 500 para permitir reintentos.
