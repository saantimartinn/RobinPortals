// Starts the Robin apps locally, laid out like production:
//   http://localhost:8888  front door (dev/proxy.mjs)
//   http://localhost:8889  shared apps site: portal, Robin Jr, Community and Admin
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PROXY_PORT = 8888;
const APPS_PORT = 8889;
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

// onLine(line) is called with every output line of the child.
function start(name, command, args, { cwd = root, env = {}, onLine = () => {} } = {}) {
  const child = spawn(command, args, { cwd, env: { ...process.env, BROWSER: 'none', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
        process.stdout.write(`[${name}] ${line}\n`);
        onLine(line);
      }
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
  env: { ROBIN_PROXY_PORT: String(PROXY_PORT), ROBIN_APPS_PORT: String(APPS_PORT) },
});
// netlify dev starts once the local function wrappers are written: it must not see the
// ones a production build may have left (see writeFunctionWrappers in site/build.mjs).
let appsStarted = false;
start('build', process.execPath, ['site/build.mjs', '--watch'], {
  onLine(line) {
    if (appsStarted || !line.includes('functions written')) return;
    appsStarted = true;
    start('apps', 'netlify', ['dev', '--offline', '--port', String(APPS_PORT), '--no-open']);
  },
});


console.log(`\nRobin en local: ${publicUrl}  (/portal, /robinjr, /therobinplan, /admin)\n`);
