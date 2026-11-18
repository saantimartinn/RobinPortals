const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('una landing con un anuncio heredado no cambia la campaña de leads nativos de Meta', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('no debe contactar Meta'));
  const landing = { id: 'landing', source_payload: { source: 'meta', page_url: '/veteaholanda/', ad_id: 'shared-ad', campaign_name: 'Campaña continua Candela' } };
  const native = { id: 'native', source_payload: { source: 'meta', ad_id: 'shared-ad', campaign_name: 'Webinar 21-11' } };
  const filename = require.resolve('../netlify/functions/admin-crm-leads');
  const originalLoad = Module._load;
  let rows;
  const overrides = {
    '../../lib/supabase': { getSupabase: () => ({}) },
    '../../lib/admin-supabase': { getAdminSupabase: () => ({ from: () => ({ select() { return this; }, order() { return this; }, then(resolve) { return Promise.resolve({ data: rows }).then(resolve); } }) }) },
    '../../lib/auth': { readSessionFromEvent: () => ({ uid: 'admin' }) },
    '../../lib/admin-auth': { findAdminForSession: async () => ({ id: 'admin' }) },
  };
  let handler;
  try {
    Module._load = function (request, parent, isMain) {
      if (parent?.filename === filename && overrides[request]) return overrides[request];
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[filename];
    handler = require(filename).handler;
  } finally { Module._load = originalLoad; delete require.cache[filename]; }
  for (const order of [[landing, native], [native, landing]]) {
    rows = order;
    const response = await handler({ httpMethod: 'GET' });
    assert.equal(response.statusCode, 200);
    const leads = JSON.parse(response.body).leads;
    assert.equal(leads.find((lead) => lead.id === 'landing').source_payload.campaign_name, 'Campaña continua Candela');
    assert.equal(leads.find((lead) => lead.id === 'native').source_payload.campaign_name, 'Webinar 21-11');
  }
});
