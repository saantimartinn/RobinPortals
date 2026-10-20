# 01 · Entrada de aplicación, sesión y SSO

## Arranque

`frontend/src/main.jsx` monta `frontend/src/app.jsx`. `PortalRobin` llama `apiMe()` durante el mount. Si status 401, intenta `exchangeApplicationSession()` y después vuelve a consultar. Otros fallos caen a login. Para usuarios `subscriber_admin`, consulta además `/portal/api/me` a Robin Platform y comprueba la clave `platform.robin_plan` antes de presentar Admin.

## Estados y ramas de UI

```text
loading → sesión propia
  ├── 401 + identidad Platform válida → auth-sso → sesión propia
  ├── sin user → SubscriberAuthScreen
  ├── role subscriber_admin + scope platform.robin_plan → SubscriberAdmin
  ├── role subscriber → SubscriberPortal
  └── cualquier otro role → alerta / logout
```

`frontend/src/features/auth/SubscriberAuthScreen.jsx` gestiona formulario y alta; `useSubscriberAuth.js` es hook de operaciones/estado. `backend/lib/principal.js` canonicaliza role y display name. `backend/lib/auth.js` emite/lee cookie JWT y debe conservar frontera del producto.

## Recorrido SSO

1. Navigation/link cross-portal manda a `/therobinplan/` mientras el browser conserva cookie Platform.
2. Frontend consulta `/api/me`; si no hay cookie local, solicita `/api/auth/sso`.
3. `backend/functions/auth-sso.js` lee credenciales de conexión al portal origen y consulta identidad autenticada. No confía en campos enviados por React.
4. La cuenta local debe ser `subscriber`; luego el servicio crea token/cookie con key local y `/api/me` devuelve el principal local.
5. La administración restringe acciones por `subscriber_admin` y permisos adicionales; logout invalida cookies según contrato cross-portal.

## Símbolos de sesión

Ver `frontend/src/api/index.js` (`exchangeApplicationSession`, `login`, `me`, `logout`), `frontend/src/shared/utils.js` (`isSubscriberAdmin`, `isSubscriberUser`), `backend/lib/principal.js` (`isSubscriberRole`, `subscriberDisplayName`) y `backend/functions/auth-*.js`. La lista completa de exports aparece en [FILE_MAP](../FILE_MAP.md).
