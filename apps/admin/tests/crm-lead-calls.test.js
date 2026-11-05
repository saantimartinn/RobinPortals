const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('registra mensajes sin duración y conserva la duración obligatoria de las llamadas', async () => {
  const calls = [];
  const crm = {
    from(table) {
      const query = {
        select() { return query; },
        eq(field, value) { query.filter = [field, value]; return query; },
        order() { return Promise.resolve({ data: calls.filter((row) => row.lead_id === query.filter[1]), error: null }); },
        maybeSingle() { return Promise.resolve({ data: table === 'crm_leads' ? { id: 'lead-1' } : null, error: null }); },
        insert(row) { query.row = row; return query; },
        single() {
          const row = { id: `call-${calls.length + 1}`, occurred_at: '2026-11-04T10:00:00Z', ...query.row };
          calls.push(row);
          return Promise.resolve({ data: row, error: null });
        },
      };
      return query;
    },
  };
  const modules = {
    '../../lib/supabase': { getSupabase: () => ({}) },
    '../../lib/admin-supabase': { getAdminSupabase: () => crm },
    '../../lib/auth': { readSessionFromEvent: () => ({}) },
    '../../lib/admin-auth': { findAdminForSession: async () => ({ id: 'admin-1' }) },
    '../../lib/http': {
      json: (body, options = {}) => ({ statusCode: options.statusCode || 200, body: JSON.stringify(body) }),
      methodNotAllowed: () => ({ statusCode: 405 }),
      parseJsonBody: (event) => JSON.parse(event.body),
      serverError: (error) => { throw error; },
    },
    '../../lib/crm-identity': { displayName: () => 'Admin', syncCrmIdentity: async () => ({ available: true }) },
  };
  const originalLoad = Module._load;
  let handler;
  try {
    Module._load = function (request, parent, isMain) {
      if (parent?.filename.endsWith('/apps/admin/netlify/functions/admin-crm-lead-calls.js') && modules[request]) return modules[request];
      return originalLoad.call(this, request, parent, isMain);
    };
    const path = require.resolve('../netlify/functions/admin-crm-lead-calls');
    delete require.cache[path];
    handler = require(path).handler;
  } finally {
    Module._load = originalLoad;
  }

  const post = async (body) => handler({ httpMethod: 'POST', body: JSON.stringify({ leadId: 'lead-1', ...body }) });
  const invalidCall = await post({ kind: 'call', notes: 'Sin minutos' });
  assert.equal(invalidCall.statusCode, 400);
  assert.equal(calls.length, 0);

  const message = await post({ kind: 'message', notes: 'WhatsApp enviado' });
  assert.equal(message.statusCode, 201);
  assert.equal(calls[0].duration_minutes, null);
  assert.equal(JSON.parse(message.body).call.kind, 'message');
  assert.equal(JSON.parse(message.body).call.durationMinutes, null);

  const call = await post({ kind: 'call', durationMinutes: 12, notes: 'Conversación' });
  assert.equal(call.statusCode, 201);
  assert.equal(JSON.parse(call.body).call.durationMinutes, 12);

  const history = await handler({ httpMethod: 'GET', queryStringParameters: { leadId: 'lead-1' } });
  assert.deepEqual(JSON.parse(history.body).calls.map((item) => [item.kind, item.durationMinutes]), [['message', null], ['call', 12]]);
});
