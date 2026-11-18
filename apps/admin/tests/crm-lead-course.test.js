const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { resolve } = require('node:path');
const { buildSync } = require('esbuild');

function setup({ authorized = true } = {}) {
  let lead = { id: 'lead-1', name: 'Ana', crm_stage: 'Por contactar', owner_names: ['Manuel'], source_payload: { source: 'meta', campaign_name: 'PORTUGAL II', page_url: '/vaparaaholanda/', course: 'Y13 / Grade 12 (US)', field_data: { curso_actual: 'Y13 / Grade 12 (US)' } } };
  const writes = [];
  const crm = { from(table) {
    assert.equal(table, 'crm_leads');
    let patch;
    return {
      select() { return this; }, eq() { return this; }, order() { return this; },
      update(value) { patch = value; return this; },
      async single() {
        if (patch) { writes.push(patch); lead = { ...lead, ...patch }; }
        return { data: structuredClone(lead), error: null };
      },
      then(done) { return Promise.resolve({ data: [structuredClone(lead)], error: null }).then(done); },
    };
  } };
  const filename = require.resolve('../netlify/functions/admin-crm-leads');
  const mocks = {
    '../../lib/supabase': { getSupabase: () => ({}) },
    '../../lib/admin-supabase': { getAdminSupabase: () => crm },
    '../../lib/auth': { readSessionFromEvent: () => authorized ? { uid: 'admin-1' } : null },
    '../../lib/admin-auth': { findAdminForSession: async () => ({ id: 'admin-1' }) },
    '../../lib/crm-identity': { syncCrmIdentity: async () => ({ available: false }) },
  };
  const originalLoad = Module._load;
  let handler;
  try {
    Module._load = function (request, parent, isMain) {
      if (parent?.filename === filename && mocks[request]) return mocks[request];
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[filename];
    handler = require(filename).handler;
  } finally { Module._load = originalLoad; delete require.cache[filename]; }
  return { handler, writes, patch: (patch) => handler({ httpMethod: 'PATCH', body: JSON.stringify({ id: 'lead-1', patch }) }) };
}

test('guarda los tres cursos y conserva campaña, formulario, estado y responsable', async () => {
  const { handler, patch, writes } = setup();
  for (const course of ['1º de Bachillerato', '2º de Bachillerato', 'Otros']) {
    const response = await patch({ course });
    assert.equal(response.statusCode, 200);
    const { lead } = JSON.parse(response.body);
    assert.equal(lead.source_payload.course, course);
    assert.equal(lead.source_payload.campaign_name, 'PORTUGAL II');
    assert.equal(lead.source_payload.page_url, '/vaparaaholanda/');
    assert.deepEqual(lead.source_payload.field_data, { curso_actual: 'Y13 / Grade 12 (US)' });
    assert.equal(lead.crm_stage, 'Por contactar');
    assert.deepEqual(lead.owner_names, ['Manuel']);
    const reread = JSON.parse((await handler({ httpMethod: 'GET' })).body).leads[0];
    assert.equal(reread.source_payload.course, course);
  }
  assert.equal(writes.length, 3);
  assert.ok(writes.every((value) => Object.keys(value).length === 1 && value.source_payload));
});

test('el curso se combina con otras ediciones de metadatos', async () => {
  const { patch } = setup();
  const response = await patch({ course: 'Otros', source: 'website', crm_stage: 'Lost', lost_reason: 'price', lost_reason_detail: '' });
  assert.equal(response.statusCode, 200);
  const { lead } = JSON.parse(response.body);
  assert.equal(lead.source_payload.course, 'Otros');
  assert.equal(lead.source_payload.source, 'website');
  assert.equal(lead.source_payload.lost_reason, 'price');
  assert.equal(lead.source_payload.campaign_name, 'PORTUGAL II');
});

test('rechaza cursos libres o inválidos sin escribir en el CRM', async () => {
  const { patch, writes } = setup();
  for (const course of ['Year 12', '', null, 2, {}, ['Otros']]) {
    const response = await patch({ course });
    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, 'invalid_course');
  }
  assert.deepEqual(writes, []);
});

test('no permite editar el curso sin una sesión administrativa', async () => {
  const { patch, writes } = setup({ authorized: false });
  assert.equal((await patch({ course: 'Otros' })).statusCode, 401);
  assert.deepEqual(writes, []);
});

test('el cliente envía el curso al PATCH y relee su valor guardado', async (t) => {
  const code = buildSync({ entryPoints: [resolve(__dirname, '../src/services/admin-data.ts')], alias: { '@': resolve(__dirname, '../src') }, bundle: true, write: false, platform: 'node', format: 'esm' }).outputFiles[0].text;
  const { adminDataClient } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const calls = [];
  const { handler } = setup();
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    assert.equal(url, '/api/admin/crm/leads');
    if (options.method === 'PATCH') calls.push(JSON.parse(options.body));
    const response = await handler({ httpMethod: options.method || 'GET', body: options.body });
    return new Response(response.body, { status: response.statusCode });
  });
  await adminDataClient.updateLead('lead-1', { course: '1º de Bachillerato' });
  assert.deepEqual(calls, [{ id: 'lead-1', patch: { course: '1º de Bachillerato' } }]);
  assert.equal((await adminDataClient.listLeads())[0].course, '1º de Bachillerato');
  await adminDataClient.updateLead('lead-1', { course: 'Otros' });
  assert.equal((await adminDataClient.listLeads())[0].course, 'Otros');
});
