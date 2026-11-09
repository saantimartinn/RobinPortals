const test = require('node:test');
const assert = require('node:assert/strict');

test('el historial del recomendador exige sesión y usa el email real del lead', async () => {
  const { createHandler } = require('../netlify/functions/admin-crm-recommender');
  let emailRequested = '';
  const handler = createHandler({
    readSession: () => ({ uid: 'admin-1' }),
    findAdmin: async () => ({ id: 'admin-1' }),
    findLead: async () => ({ id: 'lead-1', email: 'Student@Example.com' }),
    queryHistory: async (email) => {
      emailRequested = email;
      return { count: 3, sessions: [{ id: 'session-3', createdAt: '2026-11-09T12:00:00Z' }] };
    },
  });
  const result = await handler({ httpMethod: 'GET', queryStringParameters: { leadId: 'lead-1' } });
  assert.equal(result.statusCode, 200);
  assert.equal(emailRequested, 'student@example.com');
  assert.deepEqual(JSON.parse(result.body), {
    count: 3,
    latest: { id: 'session-3', createdAt: '2026-11-09T12:00:00Z', url: 'https://project-robin.com/rbmt/admin/?session=session-3' },
  });
});

test('el historial no consulta RBMT sin sesión administrativa', async () => {
  const { createHandler } = require('../netlify/functions/admin-crm-recommender');
  let called = false;
  const handler = createHandler({
    readSession: () => null,
    findLead: async () => { called = true; return null; },
    queryHistory: async () => { called = true; return { count: 0, sessions: [] }; },
  });
  const result = await handler({ httpMethod: 'GET', queryStringParameters: { leadId: 'lead-1' } });
  assert.equal(result.statusCode, 401);
  assert.equal(called, false);
});
