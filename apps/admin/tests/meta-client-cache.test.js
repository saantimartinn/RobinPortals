const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { transformSync } = require('esbuild');

test('Meta browser cache and error fallback never mix selected date ranges', async (t) => {
  const stored = new Map();
  const descriptor = Object.getOwnPropertyDescriptor(global, 'localStorage');
  Object.defineProperty(global, 'localStorage', { configurable: true, value: {
    getItem: (key) => stored.get(key) || null,
    setItem: (key, value) => stored.set(key, value),
  } });
  t.after(() => {
    if (descriptor) Object.defineProperty(global, 'localStorage', descriptor);
    else delete global.localStorage;
  });
  const requests = [];
  t.mock.method(global, 'fetch', async (address) => {
    const url = new URL(address, 'http://localhost');
    requests.push(url);
    if (url.searchParams.get('from') === '2026-09-01') return Response.json({ detail: 'Meta unavailable' }, { status: 503 });
    return Response.json({ campaigns: [{ name: url.searchParams.get('from') || 'default' }] });
  });
  const filename = require.resolve('../src/services/integrations.ts');
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.require = (name) => {
    if (name === '@/lib/api-path') return { apiPath: (value) => value };
    return require(name);
  };
  compiled._compile(transformSync(fs.readFileSync(filename, 'utf8'), { loader: 'ts', format: 'cjs' }).code, filename);
  const client = compiled.exports.integrationClient;
  const october = { from: '2026-10-01', to: '2026-10-31' };
  const november = { from: '2026-11-01', to: '2026-11-10' };
  assert.equal((await client.meta(false, october)).campaigns[0].name, '2026-10-01');
  assert.equal((await client.meta(false, november)).campaigns[0].name, '2026-11-01');
  assert.equal((await client.meta(false, october)).campaigns[0].name, '2026-10-01');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].searchParams.get('to'), '2026-10-31');
  await assert.rejects(client.meta(false, { from: '2026-09-01', to: '2026-09-30' }), /Meta unavailable/);
});
