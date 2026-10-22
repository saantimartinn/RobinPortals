# Testing and CI

The pull-request gate is defined in `.github/workflows/ci.yml` and runs on Node 20.
It installs dependencies from both lockfiles, then executes syntax, lint, tests and
the production frontend build.

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

Tras ejecutar los generadores, `git diff` no debe mostrar cambios en `docs/API_INVENTORY.md`,
`docs/COMPONENT_MAP.md` ni `docs/FILE_MAP.md`. CI aplica esta comprobación automáticamente.

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

Tests use pure helpers and in-memory fakes. They must not contact Supabase, Revolut,
Google, Anthropic, Holded, Resend or any production service.
