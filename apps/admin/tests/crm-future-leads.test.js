const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadHandler({ crm, session = {}, admin = { id: 'admin-1' } }) {
  const modules = {
    '../../lib/supabase': { getSupabase: () => ({}) },
    '../../lib/admin-supabase': { getAdminSupabase: () => crm },
    '../../lib/auth': { readSessionFromEvent: () => session },
    '../../lib/admin-auth': { findAdminForSession: async () => admin },
    '../../lib/crm-identity': { displayName: () => 'Admin', syncCrmIdentity: async () => ({ available: true }) },
  };
  const originalLoad = Module._load;
  const path = require.resolve('../netlify/functions/admin-crm-future-leads');
  try {
    Module._load = function (request, parent, isMain) {
      if (parent?.filename === path && modules[request]) return modules[request];
      return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[path];
    return require(path).handler;
  } finally { Module._load = originalLoad; }
}

test('no permite leer el archivo futuro sin sesión administrativa', async () => {
  for (const identity of [{ session: null }, { admin: null }]) {
    const handler = loadHandler({ ...identity, crm: { from() { throw new Error('No debe consultar la base de datos'); } } });
    assert.equal((await handler({ httpMethod: 'GET' })).statusCode, 401);
  }
});

test('lee todas las páginas del archivo sin escribir y excluye los leads de prueba', async () => {
  const rows = Array.from({ length: 1002 }, (_, index) => ({ id: String(index), academic_year: index % 2 ? '2027-28' : '2028-29', lead_snapshot: index === 0 ? { is_test: true } : index === 1 ? { source_payload: { simulated: true } } : {} }));
  const ranges = [];
  const handler = loadHandler({ crm: { from(table) {
    assert.equal(table, 'crm_future_leads');
    return {
      select() { return this; }, order() { return this; },
      async range(start, end) { ranges.push([start, end]); return { data: rows.slice(start, end + 1), error: null }; },
    };
  } } });
  const response = await handler({ httpMethod: 'GET' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999]]);
  assert.deepEqual(JSON.parse(response.body).leads, rows.slice(2));
});

test('mantiene el traslado existente a próximos cursos', async () => {
  const calls = [];
  const handler = loadHandler({ crm: { async rpc(name, args) { calls.push([name, args]); return { data: 'future-1', error: null }; } } });
  const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ leadId: 'lead-1', academicYear: '2028-29' }) });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [['move_crm_lead_to_future', { p_lead_id: 'lead-1', p_academic_year: '2028-29', p_actor_id: 'admin-1', p_actor_name: 'Admin' }]]);
  assert.equal(JSON.parse(response.body).futureLeadId, 'future-1');
});
