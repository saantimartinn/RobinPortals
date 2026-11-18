const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');

for (const app of ['portal', 'robinjr']) {
  test(`${app}: el inventario incluye dependencias compartidas sin ejecutar sus módulos`, () => {
    const root = mkdtempSync(join(tmpdir(), 'robin-env-inventory-'));
    const appDir = join(root, 'apps', app);
    const packages = join(root, 'packages', 'shared');
    try {
      mkdirSync(join(appDir, 'scripts'), { recursive: true });
      mkdirSync(join(appDir, 'lib'), { recursive: true });
      mkdirSync(packages, { recursive: true });
      const script = join(appDir, 'scripts', 'check-env-example.js');
      writeFileSync(script, readFileSync(resolve(__dirname, '../../apps', app, 'scripts/check-env-example.js')));
      writeFileSync(join(appDir, 'lib', 'app.cjs'), "require('../../../packages/shared/config.cjs');\nprocess.env.APP_KEY;\n");
      writeFileSync(join(packages, 'config.cjs'), "require('./nested.cjs');\nprocess.env.SHARED_KEY;\nthrow new Error('must_not_execute');\n");
      writeFileSync(join(packages, 'nested.cjs'), 'process.env.NESTED_KEY;\nprocess.env.ROBIN_APP_ID;\nprocess.env.ROBIN_SITE_URL;\n');
      const example = join(appDir, '.env.example');
      const run = () => spawnSync(process.execPath, [script], { cwd: appDir, encoding: 'utf8' });
      writeFileSync(example, 'APP_KEY=\nSHARED_KEY=\nNESTED_KEY=\n');
      assert.equal(run().status, 0);
      writeFileSync(example, 'APP_KEY=\nNESTED_KEY=\n');
      assert.match(run().stderr, /Missing from \.env\.example: SHARED_KEY/);
      writeFileSync(example, 'APP_KEY=\nSHARED_KEY=\nNESTED_KEY=\nUNUSED_KEY=\n');
      assert.match(run().stderr, /Unused in code: UNUSED_KEY/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
