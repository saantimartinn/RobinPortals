// Build every frontend in a temporary directory so the running dev site keeps serving.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { APPS, ROOT } from '../site/apps.mjs';

const config = spawnSync(process.execPath, ['site/generate-config.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
if (config.status !== 0) {
  process.stderr.write(config.stderr || config.stdout || 'La configuración de Netlify no coincide.');
  process.exit(config.status || 1);
}

const temp = mkdtempSync(join(tmpdir(), 'robin-release-build-'));
try {
  for (const app of APPS) {
    const prefix = `${app.id.toUpperCase()}__`;
    const vite = Object.fromEntries(Object.entries(process.env)
      .filter(([key]) => key.startsWith(`${prefix}VITE_`))
      .map(([key, value]) => [key.slice(prefix.length), value]));
    const result = spawnSync('npx', ['vite', 'build', '--outDir', join(temp, app.id), '--emptyOutDir'], {
      cwd: resolve(ROOT, app.frontend), env: { ...process.env, ...vite }, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    });
    if (result.status !== 0) {
      process.stderr.write(`${app.id}: ${String(result.stderr || result.stdout || 'Error de compilación').slice(-1500)}\n`);
      process.exit(result.status || 1);
    }
    console.log(`${app.id}: compilación correcta`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
