# 04 · API, Functions y servicios

## Frontera HTTP

`netlify.toml` es la fuente de verdad de build, redirects, headers, edge routes y schedules. Las rutas `/api/*` se reescriben internamente a `/.netlify/functions/<name>`; llamadas browser no abandonan origen y envían cookies. Un request de webhook usa contrato, firma y límites de cuerpo propios.

```text
portal-source/src/api/*.js → /api/... → netlify.toml → netlify/functions/*.js
  → lib/*.js → Supabase / proveedor externo
```

`docs/API_INVENTORY.md` contiene rutas, método inferido, auth/role e integraciones; `docs/API_CONTRACTS.md` explica shapes relevantes. Los datos derivados por regex son pistas: leer handler como contrato final.

## Netlify Functions

Handlers incluyen auth/me, perfil, FAQ, onboarding, cobros/pagos, documentos, careers, bookings, CRM convert/website, clientes, dashboard admin, Drive, Notion/Meet webhooks, Revolut webhook, chat/AI, notifications y tareas programadas. Los nombres de handlers conservan la ruta de despliegue, aunque las responsabilidades compartan módulos de `lib/`.

Secuencia dentro de un handler:

1. determina método, origen/cabeceras y cuerpo;
2. construye el principal desde la cookie o valida secreto/firma de proveedor;
3. verifica rol, tab scope y ownership de usuario/registro;
4. valida las entradas con helpers y schema aplicable;
5. invoca una regla en `lib/` o `shared/` y accede a Supabase/proveedor;
6. devuelve JSON/PDF/SSE con status estable y respuesta cacheada solo cuando procede.

## `lib/` y `shared/`

`lib/` agrupa el backend Node: autenticación, HTTP, identidad, authorization, Supabase, payments/Revolut, OAuth Google, Drive, Sheets, Calendar/Meet, Holded, Notion, PDF, careers, FAQ, storage, email, AI, logs/observability y retries. Separa handler de servicio: un servicio reutilizado no debería conocer `event` Netlify.

`shared/` contiene fuentes CommonJS consumibles en browser y backend con contratos de roles, contenido contractual, política de contraseña y configuración financiera. Antes de cambiar un módulo shared, revisar importadores en ambos runtimes y mantener la semántica identical.

## Edge Functions

`netlify/edge-functions/rate-limit-identity.mjs` y `rate-limit-expensive.mjs` ejecutan límites antes del compute de Function para grupos de rutas. La asignación concreta a endpoint se encuentra en `netlify.toml`; revisar rate-limit y Function conjuntamente para no confiar en middleware aislado.
