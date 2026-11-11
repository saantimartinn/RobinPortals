const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadHandler() {
  const filename = require.resolve('../netlify/functions/admin-meta-insights');
  const originalLoad = Module._load;
  const modules = {
    '../../lib/supabase': { getSupabase: () => ({ from: () => ({
      select() { return this; }, eq() { return this; },
      async single() { return { data: { id: 'admin-1', role: 'admin' }, error: null }; },
    }) }) },
    '../../lib/auth': { readSessionFromEvent: () => ({ uid: 'admin-1' }) },
  };
  try {
    Module._load = function (request, parent, isMain) {
      if (parent?.filename === filename && modules[request]) return modules[request];
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[filename];
    return require(filename).handler;
  } finally {
    Module._load = originalLoad;
    delete require.cache[filename];
  }
}

function mockMeta(t) {
  const requests = [];
  const original = { META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN, META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID };
  process.env.META_ACCESS_TOKEN = 'test-token';
  process.env.META_AD_ACCOUNT_ID = '123';
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  t.mock.method(global, 'fetch', async (address) => {
    const url = new URL(address);
    requests.push(url);
    if (url.pathname.endsWith('/campaigns')) return Response.json({ data: [{ id: 'campaign-1', effective_status: 'ACTIVE' }] });
    if (!url.pathname.endsWith('/insights')) return Response.json({ name: 'Robin test', currency: 'EUR', timezone_name: 'Europe/Madrid' });
    const range = JSON.parse(url.searchParams.get('time_range') || 'null');
    return Response.json({ data: [{ campaign_id: 'campaign-1', campaign_name: range?.since || 'Default', spend: range?.since.endsWith('01') ? '100' : '200', date_start: range?.since || '2026-10-01' }] });
  });
  return requests;
}

test('Meta queries the exact selected range and keeps concurrent date ranges in separate caches', async (t) => {
  const requests = mockMeta(t);
  const handler = loadHandler();
  const request = async (from, to) => {
    const response = await handler({ httpMethod: 'GET', queryStringParameters: { from, to } });
    assert.equal(response.statusCode, 200);
    return JSON.parse(response.body);
  };
  const [october, november] = await Promise.all([
    request('2026-10-01', '2026-10-31'), request('2026-11-02', '2026-11-10'),
  ]);
  assert.equal(october.campaigns[0].spend, 100);
  assert.equal(november.campaigns[0].spend, 200);
  assert.equal(october.campaigns[0].name, '2026-10-01');
  assert.equal(november.campaigns[0].name, '2026-11-02');
  const count = requests.length;
  await request('2026-10-01', '2026-10-31');
  assert.equal(requests.length, count);
  const insights = requests.filter((url) => url.pathname.endsWith('/insights'));
  assert.equal(insights.length, 6);
  for (const url of insights) {
    const range = JSON.parse(url.searchParams.get('time_range'));
    assert.ok(['2026-10-01', '2026-11-02'].includes(range.since));
    assert.equal(range.until, range.since === '2026-10-01' ? '2026-10-31' : '2026-11-10');
    assert.equal(url.searchParams.has('date_preset'), false);
  }
});

test('Meta rejects incomplete, impossible and reversed date ranges before querying the provider', async (t) => {
  const requests = mockMeta(t);
  const handler = loadHandler();
  for (const range of [
    { from: '2026-10-01' },
    { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-11-10', to: '2026-11-01' },
  ]) {
    const response = await handler({ httpMethod: 'GET', queryStringParameters: range });
    assert.equal(response.statusCode, 400);
  }
  assert.equal(requests.length, 0);
});

test('Meta preserves the default last-30-days view', async (t) => {
  const requests = mockMeta(t);
  const handler = loadHandler();
  for (const queryStringParameters of [undefined, null]) {
    const response = await handler({ httpMethod: 'GET', queryStringParameters });
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).period, 'last_30d');
  }
  assert.ok(requests.filter((url) => url.pathname.endsWith('/insights')).every((url) => url.searchParams.get('date_preset') === 'last_30d'));
});

test('Meta includes later campaign and daily pages with the selected date range', async (t) => {
  mockMeta(t);
  t.mock.method(global, 'fetch', async (address) => {
    const url = new URL(address);
    const after = url.searchParams.get('after');
    const page = (first, last) => Response.json(after ? { data: [last] } : {
      data: [first], paging: { next: 'next-page', cursors: { after: 'page-2' } },
    });
    if (url.pathname.endsWith('/campaigns')) return page({ id: 'one', effective_status: 'ACTIVE' }, { id: 'two', effective_status: 'PAUSED' });
    if (!url.pathname.endsWith('/insights')) return Response.json({ name: 'Robin test', currency: 'EUR' });
    assert.deepEqual(JSON.parse(url.searchParams.get('time_range')), { since: '2026-10-01', until: '2026-10-31' });
    if (url.searchParams.get('level') === 'campaign') return page({ campaign_id: 'one', spend: '10' }, { campaign_id: 'two', spend: '20' });
    if (url.searchParams.has('time_increment')) return page({ date_start: '2026-10-01', spend: '10', cpm: '1' }, { date_start: '2026-10-02', spend: '20', cpm: '2' });
    return Response.json({ data: [{ spend: '30' }] });
  });
  const response = await loadHandler()({ httpMethod: 'GET', queryStringParameters: { from: '2026-10-01', to: '2026-10-31' } });
  assert.equal(response.statusCode, 200);
  const snapshot = JSON.parse(response.body);
  assert.deepEqual(snapshot.campaigns.map((row) => [row.id, row.spend, row.status]), [['two', 20, 'PAUSED'], ['one', 10, 'ACTIVE']]);
  assert.deepEqual(snapshot.daily.map((row) => [row.date, row.spend]), [['2026-10-01', 10], ['2026-10-02', 20]]);
});
