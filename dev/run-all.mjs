// Starts the whole Robin stack locally, laid out like production:
//   http://localhost:8888  front door (dev/proxy.mjs), stands in for project-robin.com
//   http://localhost:8889  shared apps site: portal, Robin Jr, Community and Admin
//   http://localhost:8890  public website (Web-robin, its own repository)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PROXY_PORT = 8888;
const APPS_PORT = 8889;
const WEB_PORT = 8890;
const publicUrl = `http://localhost:${PROXY_PORT}`;

const children = [];
let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
}
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

function start(name, command, args, { cwd = root, env = {} } = {}) {
  const child = spawn(command, args, { cwd, env: { ...process.env, BROWSER: 'none', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) process.stdout.write(`[${name}] ${line}\n`);
    });
  }
  child.on('exit', (code, signal) => {
    process.stdout.write(`[${name}] stopped (${signal || code})\n`);
    if (!stopping) stop('SIGTERM');
  });
}

for (const step of [
  ['site/generate-config.mjs', '--check'],
  ['site/env.mjs', '--public-url', publicUrl, '--site-url', `http://localhost:${APPS_PORT}`],
]) {
  const result = spawnSync(process.execPath, step, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

start('proxy', process.execPath, ['dev/proxy.mjs'], {
  env: { ROBIN_PROXY_PORT: String(PROXY_PORT), ROBIN_APPS_PORT: String(APPS_PORT), ROBIN_WEB_PORT: String(WEB_PORT) },
});
start('build', process.execPath, ['site/build.mjs', '--watch']);
start('apps', 'netlify', ['dev', '--offline', '--port', String(APPS_PORT), '--no-open']);

const web = resolve(root, 'Web-robin');
if (existsSync(web)) {
  start('web', 'netlify', [
    'dev', '--offline', '--port', String(WEB_PORT), '--no-open',
    '--command', 'npm run dev -- --host 127.0.0.1 --port 4321 --strictPort', '--target-port', '4321',
  ], { cwd: web, env: { PUBLIC_LOGIN_URL: `${publicUrl}/login` } });
}

console.log(`\nRobin en local: ${publicUrl}  (web, /portal, /robinjr, /therobinplan, /admin)\n`);
