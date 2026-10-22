# Project Robin

Monorepo for the Robin student portal, Robin Jr, community subscriptions, and admin app.
The public website remains independent in the sibling `Web-robin` repository.

## Structure

- `apps/portal` — Robin-platform-cliente
- `apps/robinjr` — Robin Jr
- `apps/community` — robin-subscriptions
- `apps/admin` — Robin-Admin
- `packages/auth` — shared authentication primitives
- `packages/portal-nav` — shared cross-portal navigation
- `infra/cloudflare` — Cloudflare routing configuration
- `dev` — local development tools and ignored environment files

See `dev/README.md` for local startup instructions.
