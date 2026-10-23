'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

process.env.PORTAL__SUPABASE_URL = 'https://portal.example';
process.env.PORTAL__ONLY_PORTAL = 'yes';
process.env.ROBINJR__SUPABASE_URL = 'https://robinjr.example';
process.env.SITE_LEVEL = 'shared';
const { wrapFunction, wrapScheduled, toModern } = require('../app-env.cjs');

const probe = () => ({
  handler: async () => {
    await new Promise((done) => setTimeout(done, 5));
    return { url: process.env.SUPABASE_URL, own: process.env.ONLY_PORTAL, site: process.env.SITE_LEVEL, other: process.env.ROBINJR__SUPABASE_URL, keys: Object.keys(process.env) };
  },
});

test('each app sees only its own variables, also when invocations overlap', async () => {
  const portal = wrapFunction('portal', probe);
  const robinjr = wrapFunction('robinjr', probe);
  const [a, b] = await Promise.all([portal.handler(), robinjr.handler()]);
  assert.equal(a.url, 'https://portal.example');
  assert.equal(a.own, 'yes');
  assert.equal(a.site, 'shared');
  assert.equal(a.other, undefined);
  assert.ok(!a.keys.some((key) => key.startsWith('ROBINJR__')));
  assert.equal(b.url, 'https://robinjr.example');
  assert.equal(b.own, undefined);
  assert.equal(process.env.SUPABASE_URL, undefined);
});

test('module-level reads happen inside the app environment', () => {
  const mod = wrapFunction('robinjr', () => ({ loadedWith: process.env.SUPABASE_URL }));
  assert.equal(mod.loadedWith, 'https://robinjr.example');
});

test('scheduled jobs only run when the site enables them', async () => {
  let runs = 0;
  const job = wrapScheduled('portal', () => ({ handler: async () => { runs += 1; return { statusCode: 200 }; } }));
  delete process.env.ROBIN_RUN_SCHEDULED;
  assert.equal((await job.handler()).statusCode, 204);
  process.env.ROBIN_RUN_SCHEDULED = 'true';
  assert.equal((await job.handler()).statusCode, 200);
  assert.equal(runs, 1);
});

test('modern functions translate the request and the classic result', async () => {
  let seen;
  const fn = toModern(async (event) => {
    seen = event;
    return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, multiValueHeaders: { 'Set-Cookie': ['a=1; Path=/', 'b=2; Path=/'] }, body: '{"ok":true}' };
  });
  const response = await fn(new Request('https://x.test/portal/api/me?id=7&tag=a&tag=b', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 's=1' }, body: '{"n":1}' }));
  assert.equal(seen.httpMethod, 'POST');
  assert.equal(seen.body, '{"n":1}');
  assert.equal(seen.isBase64Encoded, false);
  assert.deepEqual(seen.queryStringParameters, { id: '7', tag: 'b' });
  assert.deepEqual(seen.multiValueQueryStringParameters.tag, ['a', 'b']);
  assert.equal(seen.headers.cookie, 's=1');
  assert.equal(response.status, 201);
  assert.deepEqual(response.headers.getSetCookie(), ['a=1; Path=/', 'b=2; Path=/']);
  assert.equal(await response.text(), '{"ok":true}');
});

test('modern functions keep binary bodies binary', async () => {
  const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]);
  let seen;
  const fn = toModern(async (event) => { seen = event; return { statusCode: 200, isBase64Encoded: true, body: pdf.toString('base64') }; });
  const response = await fn(new Request('https://x.test/u', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' }, body: pdf }));
  assert.equal(seen.isBase64Encoded, true);
  assert.deepEqual(Buffer.from(seen.body, 'base64'), pdf);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
});
