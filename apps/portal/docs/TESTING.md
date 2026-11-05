# Testing and CI

El monorepo no contiene actualmente un workflow de CI en `.github/workflows/`.
Los comandos siguientes son comprobaciones locales de la app; desde la raíz,
`npm test` ejecuta los tests de las cuatro apps y `npm run site:build` compila
el sitio unificado.

## Local gates

Run from the repository root:

```bash
node scripts/generate-api-inventory.js
node scripts/generate-component-map.js
node scripts/generate-file-map.js
node scripts/check-syntax.js
node scripts/check-function-boundaries.js
node scripts/lint.js
node scripts/check-frontend-bindings.js
node scripts/check-empty-catches.js
node scripts/check-env-example.js
node scripts/check-pii-logs.js
node scripts/check-platform-scope.js
node --test test/*.test.js test/*.test.mjs test/*.test.cjs
npm --prefix portal-source run build
```

Tras ejecutar los generadores, revisa el diff de `docs/API_INVENTORY.md`,
`docs/COMPONENT_MAP.md` y `docs/FILE_INDEX.generated.md` y conserva los cambios
que reflejen el source actual.

`scripts/lint.js` is intentionally small. It rejects empty catches, `debugger`,
`eval` and the `Function` constructor without imposing a repository-wide style
rewrite. JSX correctness remains covered by the Vite production build.

`scripts/check-platform-scope.js` comprueba únicamente archivos locales e impide que
vuelvan a aparecer rutas o módulos ajenos a los portales de alumnos y administración.

## Test priorities covered

- identity selection and ambiguous login rejection;
- signed session cookies and tamper rejection;
- admin authorization and client record ownership;
- document Storage behavior;
- Revolut fulfillment result handling and money rounding;
- discount activation, redemption limit, percentage and duration;
- booking windows and overlap rejection;
- webhook secret fail-closed behavior;
- financial config, retries and structured observability.
- cuota única de Mentoría, crédito de 666,33 € y primera cuota cubierta de
  General; comprobación de diferencias en Delft, Llegada y General internacional.

Tests use pure helpers and in-memory fakes. They must not contact Supabase, Revolut,
Google, Anthropic, Holded, Resend or any production service.
