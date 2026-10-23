import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { legacyCjsBrowser } from '../../dev/vite-legacy-cjs.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

test('both portal contracts compile without Node require in the browser', () => {
  for (const app of ['portal', 'robinjr']) {
    const sharedDir = resolve(root, 'apps', app, 'shared');
    const filename = resolve(sharedDir, 'contract-content.cjs');
    const source = readFileSync(filename, 'utf8');
    const compiled = legacyCjsBrowser({ sharedDir }).transform(source, filename).code;
    assert.doesNotMatch(compiled, /\brequire\s*\(/, app);
    assert.match(compiled, /export default module\.exports;/, app);
  }
});
