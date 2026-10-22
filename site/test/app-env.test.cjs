'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

process.env.PORTAL__SUPABASE_URL = 'https://portal.example';
process.env.PORTAL__ONLY_PORTAL = 'yes';
process.env.ROBINJR__SUPABASE_URL = 'https://robinjr.example';
process.env.SITE_LEVEL = 'shared';
const { wrapFunction } = require('../app-env.cjs');

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
