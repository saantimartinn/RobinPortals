# Enrutador de project-robin.com

El Worker conserva WordPress como origen predeterminado y envía únicamente estas rutas a Netlify:

- `/login` al selector de portales.
- `/portal/*` al portal de aplicación.
- `/therobinplan/*` a The Robin Plan.

Las rutas públicas de API quedan aisladas bajo `/portal/api/*` y `/therobinplan/api/*`.
El Worker elimina ese primer prefijo antes de llamar a las Functions existentes de cada proyecto.
