// Copies each app's environment variables from the Netlify project it runs on
// today into apps/<app>/.env, so the app runs locally with exactly the values
// it has in production. It only reads from Netlify (`netlify api getEnvVars`).
// Netlify hides the production value of secret variables; for those the
// value of the "dev" context is used, and failing that the one already in the
// local .env. The previous file is kept as apps/<app>/.env.bak.
// Usage: node site/pull-env.mjs [app ...]
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { APPS, ROOT } from './apps.mjs';
import { readEnvFile, writeEnvFile } from './dotenv.mjs';

function netlifyApi(method, data) {
  const result = spawnSync('netlify', ['api', method, '--data', JSON.stringify(data)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`netlify api ${method}: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}

const usable = (value) => typeof value === 'string' && value !== '' && !value.includes('****');
const contextValue = (variable, context) => variable.values.find((entry) => entry.context === context)?.value;

const wanted = process.argv.slice(2);
const apps = APPS.filter((app) => !wanted.length || wanted.includes(app.id));
for (const app of apps) {
  const { account_id: accountId, name } = netlifyApi('getSite', { site_id: app.netlifySiteId });
  const variables = netlifyApi('getEnvVars', { account_id: accountId, site_id: app.netlifySiteId });
  const envPath = resolve(ROOT, app.dir, '.env');
  const local = readEnvFile(envPath);
  const values = {};
  const fromDev = [];
  const fromLocal = [];
  const missing = [];
  for (const variable of variables) {
    const production = contextValue(variable, 'production') ?? contextValue(variable, 'all');
    const dev = contextValue(variable, 'dev') ?? contextValue(variable, 'all');
    if (usable(production)) values[variable.key] = production;
    else if (usable(dev)) { values[variable.key] = dev; fromDev.push(variable.key); }
    else if (usable(local[variable.key])) { values[variable.key] = local[variable.key]; fromLocal.push(variable.key); }
    else if (production !== '') missing.push(variable.key);
  }
  if (existsSync(envPath)) copyFileSync(envPath, `${envPath}.bak`);
  writeEnvFile(envPath, values, [
    `Variables of the Netlify project "${name}" (${app.netlifySiteId}), copied by site/pull-env.mjs.`,
    'Real credentials: never commit this file.',
  ]);
  console.log(`[${app.id}] ${Object.keys(values).length} variables de "${name}" -> ${app.dir}/.env`);
  if (fromDev.length) console.log(`[${app.id}]   secreto en producción, valor del contexto dev: ${fromDev.join(', ')}`);
  if (fromLocal.length) console.log(`[${app.id}]   secreto en producción, se mantiene el valor local: ${fromLocal.join(', ')}`);
  if (missing.length) console.log(`[${app.id}]   sin valor legible, no se escribe: ${missing.join(', ')}`);
}
