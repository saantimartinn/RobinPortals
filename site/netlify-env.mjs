// Prepares the environment of the shared apps site on Netlify, as the body of
// `netlify api createEnvVars`, without sending it anywhere:
//   - every app's variables from apps/<app>/.env (see site/pull-env.mjs) as APP__NAME,
//     scoped to builds only: site/build.mjs --embed-env bundles them into the
//     functions, which only get 4 KB of environment;
//   - new random JWT_SECRET values (portal and admin share one: same session cookie);
//   - the site variables PUBLIC_BASE_URL, ROBIN_SITE_URL and ALLOWED_ORIGINS.
// It reads the apps' current Netlify projects to list the secrets whose
// production value Netlify hides: those must be filled in by hand.
// Usage: node site/netlify-env.mjs --site-url https://<site>.netlify.app [--public-url https://project-robin.com]
// Writes .netlify/production-env.json (gitignored, contains secrets).
import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { APPS, ROOT } from './apps.mjs';
import { scopedAppEnvs } from './env.mjs';
import { appSiteEnv, productionValue, usableValue } from './netlify-api.mjs';

const { prefix } = createRequire(import.meta.url)('./app-env.cjs');

const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : fallback;
};
const siteUrl = String(arg('--site-url', '')).replace(/\/$/, '');
const publicUrl = String(arg('--public-url', 'https://project-robin.com')).replace(/\/$/, '');
if (!/^https:\/\//.test(siteUrl)) {
  console.error('Indica la URL del sitio nuevo: --site-url https://<sitio>.netlify.app');
  process.exit(1);
}

const secret = () => randomBytes(48).toString('base64url');
const { values } = scopedAppEnvs();
const sessionSecret = secret();
values[`${prefix('portal')}JWT_SECRET`] = sessionSecret;
values[`${prefix('admin')}JWT_SECRET`] = sessionSecret;
values[`${prefix('robinjr')}JWT_SECRET`] = secret();
values[`${prefix('community')}JWT_SECRET`] = secret();

const manual = [];
for (const app of APPS) {
  const { name, variables } = appSiteEnv(app);
  for (const variable of variables) {
    const production = productionValue(variable);
    if (variable.key === 'JWT_SECRET' || production === '' || usableValue(production)) continue; // '' = empty in production too
    const key = `${prefix(app.id)}${variable.key}`;
    manual.push(`${key} (proyecto "${name}")${key in values ? '' : ': no está en el fichero, hay que añadirla'}`);
  }
}

const site = { PUBLIC_BASE_URL: publicUrl, ROBIN_SITE_URL: siteUrl, ALLOWED_ORIGINS: [publicUrl, siteUrl].join(',') };
const body = [
  ...Object.entries(values).map(([key, value]) => ({ key, scopes: ['builds'], values: [{ context: 'all', value }] })),
  ...Object.entries(site).map(([key, value]) => ({ key, scopes: ['builds', 'functions', 'runtime'], values: [{ context: 'all', value }] })),
];
const output = resolve(ROOT, '.netlify/production-env.json');
mkdirSync(resolve(ROOT, '.netlify'), { recursive: true });
writeFileSync(output, JSON.stringify(body, null, 2), { mode: 0o600 });
chmodSync(output, 0o600);
console.log(`[netlify-env] ${body.length} variables -> .netlify/production-env.json (${Object.keys(values).length} de las apps, solo build; ${Object.keys(site).length} del sitio)`);
console.log('[netlify-env] JWT_SECRET nuevos generados (portal y admin comparten el mismo).');
if (manual.length) {
  console.log('[netlify-env] Netlify no deja leer su valor de producción; en el fichero va el de desarrollo o el local. Pon el real a mano:');
  for (const line of manual) console.log(`  - ${line}`);
}
