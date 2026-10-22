import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readEnv = (path) => {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
    }));
};
const local = { ...readEnv(resolve(root, 'dev/.env')), ...process.env };
const services = [
  { name: 'Robin Jr', path: 'apps/robinjr', functions: 'netlify/functions', port: 8888, target: 5174, command: 'npm --prefix portal-source run dev -- --host 127.0.0.1 --port 5174 --strictPort' },
  { name: 'Community', path: 'apps/community', functions: 'backend/functions', port: 8889, target: 5176, command: 'npm --prefix frontend run dev -- --host 127.0.0.1 --port 5176 --strictPort' },
  { name: 'Admin', path: 'apps/admin', functions: 'netlify/functions', port: 8890, target: 5175, command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort' },
  { name: 'Portal', path: 'apps/portal', functions: 'netlify/functions', port: 8891, target: 5177, command: 'npm --prefix portal-source run dev -- --host 127.0.0.1 --port 5177 --strictPort' },
  // Web-robin remains its own Git repository and deploy. It is optional in a clean clone.
  { name: 'Web (independiente)', path: 'Web-robin', functions: 'netlify/functions', port: 8892, target: 4321, command: 'npm run dev -- --host 127.0.0.1 --port 4321 --strictPort', web: true },
].filter((service) => existsSync(resolve(root, service.path)));

const children = [];
let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
}
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

const proxy = spawn(process.execPath, [resolve(root, 'dev/proxy.mjs')], {
  cwd: root,
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
});
children.push(proxy);
for (const stream of ['stdout', 'stderr']) {
  proxy[stream].on('data', (chunk) => process.stdout.write(chunk.toString()));
}
proxy.on('exit', (code, signal) => {
  process.stdout.write(`[local proxy] stopped (${signal || code})\n`);
  if (!stopping) stop('SIGTERM');
});

for (const service of services) {
  const cwd = resolve(root, service.path);
  const env = { ...local, BROWSER: 'none' };
  const appEnv = readEnv(resolve(cwd, '.env'));
  const allowedOrigins = [
    ...(appEnv.ALLOWED_ORIGINS || '').split(','),
    ...(env.ALLOWED_ORIGINS || '').split(','),
    `http://127.0.0.1:${service.port}`,
  ].map((origin) => origin.trim()).filter(Boolean);
  env.ALLOWED_ORIGINS = [...new Set(allowedOrigins)].join(',');
  env.VITE_ROBINJR_URL = local.ROBINJR_ORIGIN || 'http://127.0.0.1:8888';
  env.VITE_ROBIN_COMMUNITY_URL = local.COMMUNITY_ORIGIN || 'http://127.0.0.1:8889';
  env.VITE_ROBIN_ADMIN_URL = local.ADMIN_ORIGIN || 'http://127.0.0.1:8890';
  env.VITE_ROBIN_PORTAL_URL = local.PORTAL_ORIGIN || 'http://127.0.0.1:8891';
  env.VITE_ROBIN_LOGIN_URL = `${local.PORTAL_ORIGIN || 'http://127.0.0.1:8891'}/portal/`;
  if (service.web) {
    env.PORTAL_ORIGIN = local.WEB_LOGIN_TARGET || local.PORTAL_ORIGIN || 'http://127.0.0.1:8891';
    env.PUBLIC_LOGIN_URL = `${local.WEB_ORIGIN || 'http://127.0.0.1:8892'}/login`;
    env.ROBIN_LOCAL_DEV = '1';
    const build = spawnSync('npm', ['run', 'build'], { cwd, env, stdio: 'inherit' });
    if (build.status !== 0) {
      console.error('[Web (independiente)] Build failed; local services were not started.');
      process.exit(build.status || 1);
    }
  }
  const child = spawn('netlify', [
    'dev', '--port', String(service.port + 1000), '--functions', service.functions, '--command', service.command,
    '--target-port', String(service.target), '--no-open',
  ], {
    cwd,
    env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  children.push(child);
  for (const stream of ['stdout', 'stderr']) {
    child[stream].on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
        process.stdout.write(`[${service.name}:${service.port}] ${line}\n`);
      }
    });
  }
  child.on('exit', (code, signal) => {
    process.stdout.write(`[${service.name}:${service.port}] stopped (${signal || code})\n`);
    if (!stopping) stop('SIGTERM');
  });
}

if (children.length === 0) {
  console.error('No app folders found.');
  process.exitCode = 1;
} else {
  console.log(`Starting ${services.length} local apps:`);
  for (const service of services) console.log(`  ${service.name}: http://127.0.0.1:${service.port}`);
}
