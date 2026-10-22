// The apps that make up the shared Robin site and where each one is mounted.
// Every app keeps its own netlify.toml as the source of its routes; the site
// tooling remounts them under the app's path and prefixes its function names
// so the four apps can share one Netlify site.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const OUTPUT = resolve(ROOT, 'site/.output');
export const PUBLIC_DIR = resolve(OUTPUT, 'public');
export const FUNCTIONS_DIR = resolve(OUTPUT, 'functions');

export const APPS = [
  {
    id: 'portal',
    dir: 'apps/portal',
    functions: 'netlify/functions',
    frontend: 'apps/portal/portal-source',
    uiPath: '/portal',
    apiPath: '/portal',
    legacyUiPath: '/portal',
  },
  {
    id: 'robinjr',
    dir: 'apps/robinjr',
    functions: 'netlify/functions',
    frontend: 'apps/robinjr/portal-source',
    uiPath: '/robinjr',
    apiPath: '/robinjr',
    legacyUiPath: '/portal',
  },
  {
    id: 'community',
    dir: 'apps/community',
    functions: 'backend/functions',
    frontend: 'apps/community/frontend',
    uiPath: '/therobinplan',
    apiPath: '/therobinplan',
    legacyUiPath: '/therobinplan',
    bundler: 'esbuild',
    // Written by the community Vite build into its own _redirects file.
    extraRedirects: [{ from: '/api/sub-admin/db', to: '/.netlify/functions/sub-admin-database', status: 200, force: true }],
  },
  {
    id: 'admin',
    dir: 'apps/admin',
    functions: 'netlify/functions',
    frontend: 'apps/admin',
    uiPath: '/admin',
    // Admin functions stay at the site root (/api/admin, /api/internal, ...),
    // which is where the admin UI and external webhooks already call them.
    apiPath: '',
    legacyUiPath: '',
  },
];

export function functionName(app, name) {
  return `${app.id}-${name}`;
}
