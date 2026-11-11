'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

process.env.PORTAL__SUPABASE_URL = 'https://portal.example';
process.env.PORTAL__ONLY_PORTAL = 'yes';
process.env.ROBINJR__SUPABASE_URL = 'https://robinjr.example';
process.env.PORTAL__REVOLUT_MERCHANT_SECRET_KEY = 'shared-test-key';
process.env.ROBINJR__REVOLUT_MERCHANT_SECRET_KEY = 'old-sandbox-key';
process.env.SITE_LEVEL = 'shared';
const { wrapFunction, wrapScheduled, toModern, serve, runInApp, runInAppWithEnv } = require('../app-env.cjs');

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

test('a second runtime copy shares app scopes instead of inheriting Admin', () => {
  const modulePath = require.resolve('../app-env.cjs');
  delete require.cache[modulePath];
  const second = require('../app-env.cjs');
  const readFromSecond = wrapFunction('admin', () => ({
    handler: () => second.runInApp('robinjr', () => process.env.SUPABASE_URL),
  }));
  assert.equal(readFromSecond.handler(), 'https://robinjr.example');
  assert.equal(second.runInApp('portal', () => process.env.SUPABASE_URL), 'https://portal.example');
});

test('sandbox credentials do not change the normal Portal environment', async () => {
  const [sandbox, normal] = await Promise.all([
    runInAppWithEnv('portal', { REVOLUT_API_BASE: 'https://sandbox-merchant.revolut.com', CONTEXT: 'dev' }, async () => {
      await new Promise((done) => setTimeout(done, 5));
      return [process.env.REVOLUT_API_BASE, process.env.CONTEXT];
    }),
    runInApp('portal', async () => {
      await new Promise((done) => setTimeout(done, 5));
      return process.env.REVOLUT_API_BASE;
    }),
  ]);
  assert.deepEqual(sandbox, ['https://sandbox-merchant.revolut.com', 'dev']);
  assert.notEqual(normal, sandbox[0]);
  assert.notEqual(runInApp('portal', () => process.env.REVOLUT_API_BASE), sandbox[0]);
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

test('Junior and Community use the Portal Revolut key inside their own scope', async () => {
  for (const app of ['robinjr', 'community']) {
    const fn = wrapFunction(app, () => ({ handler: () => process.env.REVOLUT_MERCHANT_SECRET_KEY }));
    assert.equal(fn.handler(), 'shared-test-key');
  }
});

test('the Revolut reconciliation runs while legacy scheduled jobs remain disabled', async () => {
  delete process.env.ROBIN_RUN_SCHEDULED;
  const fn = wrapScheduled('community', () => ({ alwaysRun: true, handler: () => ({ statusCode: 200 }) }));
  assert.equal(fn.handler().statusCode, 200);
});

test('a transcript job can opt in without enabling unrelated legacy jobs', async () => {
  delete process.env.ROBIN_RUN_SCHEDULED;
  const transcript = wrapScheduled('portal', () => ({ scheduleEnabledEnv: 'MEET_TRANSCRIPT_POLL_ENABLED', handler: () => ({ statusCode: 200 }) }));
  const legacy = wrapScheduled('portal', () => ({ handler: () => ({ statusCode: 200 }) }));
  runInApp('portal', () => { process.env.MEET_TRANSCRIPT_POLL_ENABLED = 'true'; });
  try { assert.deepEqual([(await transcript.handler()).statusCode, (await legacy.handler()).statusCode], [200, 204]); }
  finally { runInApp('portal', () => { delete process.env.MEET_TRANSCRIPT_POLL_ENABLED; }); }
});

test('modern scheduled invocations reach legacy jobs without an HTTP method', async () => {
  delete process.env.ROBIN_RUN_SCHEDULED;
  let event;
  const fn = serve('portal', () => ({ alwaysRun: true, handler: async input => {
    event = input;
    return input.httpMethod ? { statusCode: 404 } : { statusCode: 200, body: '{}' };
  } }), { scheduled: true });
  const response = await fn(new Request('https://x.test/job', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"next_run":"2026-11-11T10:00:00Z"}' }));
  assert.equal(response.status, 200);
  assert.equal(event.httpMethod, undefined);
  assert.equal(event.netlifyScheduled, true);
  assert.equal(JSON.parse(event.body).next_run, '2026-11-11T10:00:00Z');
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
