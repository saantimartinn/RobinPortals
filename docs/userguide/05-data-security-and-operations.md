# 05 · Datos, seguridad y operación

## Datos

Subscriptions usa una instancia Supabase propia. `supabase/migrations/` contiene esquema versionado, `seeds/demo.sql` datos opcionales no aplicados automáticamente. `docs/DATABASE_CURRENT.md` es snapshot y `docs/IDENTITY_MODEL.md` diferencia identidad application y subscriber.

La service-role key existe solo en runtime server. `backend/lib/supabase.js` instancia clientes apropiados; manejar migrations, RLS, tablas y registros personales como cambios de datos sensibles. No ejecutar `db push` por generación de documentación.

## Seguridad

- JWT/session secrets, Stripe/Anthropic/Resend y credenciales API solo server-side; ver `.env.example` y [ENVIRONMENT](../ENVIRONMENT.md).
- Solo roles subscriber/subscriber_admin en session; el auth-Sso no confía en contenido de browser.
- `application-permissions.js` y checks en handlers protegen tabla, registro y acción; UI oculta controles como segunda barrera UX.
- Stripe firma webhooks; checkout state e intentos se validan y reconcilian por ID.
- Operaciones de alta de administrador por `scripts/create-admin.cjs` son explícitas y no se ejecutan automáticamente en build.
- PII y prompts están descritos en [PRIVACY_DATA_MAP](../PRIVACY_DATA_MAP.md) y [AI_DATA_USE](../AI_DATA_USE.md).

## Operación

`npm run dev` = Netlify Dev + API; `npm run dev:frontend` = solo Vite. `npm run verify` ejecuta arquitectura, tests, build y `docs:check`. `npm run docs:generate` refresca mapa de archivos, componente, API y árbol por carpetas.

Netlify compila workspace frontend a `dist/therobinplan`, publica `dist/`, y empaqueta `backend/functions`. La guía [OPERATIONS](../OPERATIONS.md) define despliegue, checks de producción y rollback. Para incidente frontend revisar Vite `base`, path `/therobinplan/`, Worker rule, `_redirects`, CSP y referencias a assets.
