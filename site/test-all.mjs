// Runs every app's test suite from its own folder (several suites use relative paths).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { APPS, ROOT } from './apps.mjs';

let failed = false;
for (const app of APPS) {
  const cwd = resolve(ROOT, app.dir);
  const dir = ['test', 'tests'].find((name) => existsSync(resolve(cwd, name)));
  if (!dir) continue;
  const files = readdirSync(resolve(cwd, dir)).filter((file) => /\.test\.(c|m)?js$/.test(file)).map((file) => `${dir}/${file}`);
  console.log(`\n=== ${app.id} (${files.length} archivos)`);
  const result = spawnSync(process.execPath, ['--test', ...files], { cwd, stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
