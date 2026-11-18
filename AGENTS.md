# Repository Guidelines

## Project Structure & Module Organization

Project Robin contains four apps deployed as one Netlify site: `apps/portal`, `apps/robinjr`, `apps/community`, and `apps/admin`. The public marketing website is separate.

React frontends live in `portal-source/` for Portal and Robin Jr, `frontend/` for Community, and `src/` for Admin. HTTP handlers belong in `netlify/functions/`, except Community's `backend/functions/`. Reusable server logic belongs in `lib/` or Community's `backend/lib/`. Tests live in app `test/` or `tests/` directories. Assets belong in app `public/` or `src/assets/`; shared branding lives in `packages/brand/`.

Use `packages/` for shared functionality, `site/` for unified build and routing tools, `dev/` for local development, and `infra/cloudflare/` for the domain router.

Extend existing feature/domain modules and preserve their boundaries: UI, browser API clients, HTTP handlers, and server services.

## Build, Test, and Development Commands

Use Node.js 22.13+ and the Netlify CLI. Install dependencies with `npm ci` in package directories containing lockfiles. Run these commands from the repository root:

- `npm run dev`: starts all apps at `http://localhost:8888`, including `/admin/` and `/portal/`. Reload after watched builds finish.
- `npm test`: runs the site and all four app test suites.
- `npm run site:build`: runs tests and builds the unified site into `site/.output/`.
- `npm run site:config`: regenerates root `netlify.toml` from app configurations; edit the app files first.
- `npm run site:env`: assembles local environment variables from app `.env` files.

## Coding Style & Naming Conventions

Follow surrounding code, generally using two-space indentation. Use PascalCase for React components and camelCase for functions and variables. Preserve existing filename conventions and ESM/CommonJS boundaries, including `.mjs` and `.cjs`. No repository-wide formatter or lint command is configured; avoid unrelated formatting changes.

## Testing Guidelines

Tests use Node's built-in runner and assertions. Name files `*.test.js`, `*.test.cjs`, or `*.test.mjs`. Run focused tests from their app directory, for example `node --test tests/unitour-lisboa.test.js` in `apps/admin`. Cover changed behavior, boundaries, and regressions. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

History uses short, imperative subjects such as “Add campaign Excel export and previous month preset.” Keep commits focused. PR descriptions should explain the problem, resulting behavior, validation commands, related issues when available, and screenshots for UI changes.

## Security & Configuration

Local `.env` files can contain production credentials. Never commit secrets or put service credentials in `VITE_*` variables. Keep generated output and unrelated local changes out of commits.
