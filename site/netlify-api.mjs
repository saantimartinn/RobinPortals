// Read-only access to the apps' current Netlify projects (via the logged-in Netlify CLI).
import { spawnSync } from 'node:child_process';

export function netlifyApi(method, data) {
  const result = spawnSync('netlify', ['api', method, '--data', JSON.stringify(data)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`netlify api ${method}: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}

// Variables of the Netlify project an app ran on by itself, with the project name.
export function appSiteEnv(app) {
  const { account_id: accountId, name } = netlifyApi('getSite', { site_id: app.netlifySiteId });
  return { name, variables: netlifyApi('getEnvVars', { account_id: accountId, site_id: app.netlifySiteId }) };
}

export const usableValue = (value) => typeof value === 'string' && value !== '' && !value.includes('****');
export const contextValue = (variable, context) => variable.values.find((entry) => entry.context === context)?.value;
export const productionValue = (variable) => contextValue(variable, 'production') ?? contextValue(variable, 'all');
