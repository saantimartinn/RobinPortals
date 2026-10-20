# 01 · Runtime, identidad y roles

## Límites del despliegue

Root `netlify.toml` construye el frontend independiente en `portal-source/`, lo copia a `deploy/portal/`, publica Netlify Functions desde `netlify/functions/` y aplica Edge Functions de `netlify/edge-functions/`. El Worker público se mantiene en `infrastructure/cloudflare/`; no está incluido en el build Netlify de portal.

## Arranque frontend

`portal-source/src/main.jsx` monta `portal-source/src/app.jsx`. La raíz consulta `apiMe()` y determina:

- selector público de portales en `/login` sin usuario;
- login para `/portal/` sin sesión;
- administración de aplicación cuando `isAdminUser()` reconoce el principal y existe `platform.student_portal`;
- primer paso de onboarding requerido para un cliente nuevo;
- `PortalShell` del alumno para una cuenta finalizada.

`nextOnboardingStep()` ordena los pasos y `refreshState()` actualiza la sesión tras completar cada uno. Mantener el orden de UI alineado con las precondiciones verificadas en Functions.

## Modelo de identidad

`portal-source/src/session.js` clasifica la sesión para UI; backend `lib/auth.js`, `lib/identity.js`, `lib/admins.js`, `lib/admin-profiles.js` y `lib/authorization.js` son autoridad. `users` es principal persistente; rol y perfil delimitan acceso. `admin-permissions.js` regula pestañas pero nunca reemplaza guard servidor/ownership de registro.

Robin Admin usa los endpoints de identidad de Platform a través del Worker (`/portal/api/auth/*`, `/portal/api/me`); su API de datos administrativos llega a otro deployment. Robin Subscriptions guarda suscriptores/admins y cookie propios; el SSO explícito valida una sesión Platform antes de emitir una identidad de suscripción.

## Documentos de contrato

- [IDENTITY_MODEL](../IDENTITY_MODEL.md), [AUTHORIZATION](../AUTHORIZATION.md), [PASSWORD_POLICY](../PASSWORD_POLICY.md)
- [Cloudflare paths](../CLOUDFLARE_ROUTING.md)
- [Robin Admin USERGUIDE](https://github.com/RobinManuV/Robin-Admin/blob/main/USERGUIDE.md)
- [Robin Subscriptions USERGUIDE](https://github.com/saantimartinn/robin-subscriptions/blob/main/USERGUIDE.md)
