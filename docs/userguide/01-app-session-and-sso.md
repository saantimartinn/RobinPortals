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
## Depurar la cadena de autenticación

En una visita fresca, comprueba en orden `/api/me`, el eventual 401, `/api/auth/sso` y la segunda llamada `/api/me`. No interpretes cualquier fallo como invitado: la UI actualmente convierte el fallo final en estado sin usuario, así que inspecciona red y logs saneados para distinguir cuenta ausente de caída de backend.

El SSO resuelve una identidad Platform y busca una cuenta local por identificadores permitidos. Si no existe cuenta local, es ambiguo o el rol no corresponde, la Function debe fallar sin emitir cookie. Una vez emitida, la cookie firma el principal local con los secretos de este despliegue. Los administradores además necesitan el scope esperado de aplicación.

Al modificarlo, revisa `backend/functions/auth-sso.js`, `backend/lib/application-permissions.js`, `backend/lib/auth.js`, `backend/lib/principal.js`, `frontend/src/app.jsx` y el flujo del proveedor Platform. Comprueba entrada por login local, SSO, logout, usuario sin enlace y admin sin scope.

---

**USERGUIDE:** [Índice](../../USERGUIDE.md) · [Siguiente documento de lectura →](./02-subscriber-frontend.md) · [READMELONG](../../READMELONG.md)
