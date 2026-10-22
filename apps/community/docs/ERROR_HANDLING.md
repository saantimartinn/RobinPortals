# Errores

`backend/lib/http.js` centraliza JSON, métodos, parseo y serverError. En contexto
production, serverError no incluye detail; fuera de producción puede incluirlo.
Algunos handlers mantienen respuestas específicas con detail, pendientes de normalizar.

Las funciones usan console.error para diagnóstico. No volcar secretos ni cuerpos con
PII al añadir logs. Los errores de correo son best-effort; los de persistencia Stripe
deben devolver un estado que permita reintento. No convertirlos en éxito silencioso.
