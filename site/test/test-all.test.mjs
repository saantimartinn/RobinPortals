import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

function fixture(t, failPrimarySuite = false) {
  const root = mkdtempSync(join(tmpdir(), 'robin-test-all-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'site'), { recursive: true });
  copyFileSync(new URL('../test-all.mjs', import.meta.url), join(root, 'site/test-all.mjs'));
  writeFileSync(join(root, 'site/apps.mjs'), `export const ROOT = ${JSON.stringify(root)}; export const APPS = [{ id: 'admin', dir: 'apps/admin' }];`);
  for (const dir of ['test', 'tests']) mkdirSync(join(root, 'apps/admin', dir), { recursive: true });
  writeFileSync(join(root, 'apps/admin/test/legacy.test.cjs'), "require('node:test')('legacy suite', () => {});\n");
  writeFileSync(join(root, 'apps/admin/tests/commonjs.test.js'), "require('node:test')('commonjs suite', () => {});\n");
  writeFileSync(join(root, 'apps/admin/tests/primary.test.mjs'), `import test from 'node:test'; test('primary suite', () => { ${failPrimarySuite ? "throw new Error('primary regression');" : ''} });\n`);
  writeFileSync(join(root, 'apps/admin/tests/ignored.js'), "throw new Error('not a test file');\n");
  const childEnv = { ...process.env, FORCE_COLOR: '0' };
  // The fixture runs a standalone test runner, outside this test's child context.
  delete childEnv.NODE_TEST_CONTEXT;
  return () => spawnSync(process.execPath, ['site/test-all.mjs'], { cwd: root, encoding: 'utf8', env: childEnv });
}

test('the unified runner includes both test directories and supported module formats', (t) => {
  const result = fixture(t)();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /admin \(3 archivos\)/);
  assert.match(result.stdout, /legacy suite/);
  assert.match(result.stdout, /commonjs suite/);
  assert.match(result.stdout, /primary suite/);
});

test('a regression in tests/ fails the unified runner even when test/ passes', (t) => {
  const result = fixture(t, true)();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /primary regression/);
});
