const test = require('node:test');
const assert = require('node:assert/strict');
const { safeRow } = require('../lib/developer-logs');

test('logs enviados al navegador no incluyen payload ni secretos en el mensaje', () => {
  const row = safeRow({
    id: 'event-1', source: 'revolut', result: 'error', created_at: '2026-11-05T10:00:00Z',
    message: 'Error para cliente@example.com en https://example.com/pay?token=abc; api_key=sk_test_abcdefghijklmnopqrstuvwxyz123456',
    payload: { password: 'secret', customer: { email: 'cliente@example.com' } },
  }, 'portal');
  const serialized = JSON.stringify(row);
  assert.equal(row.portal, 'portal');
  assert.equal(row.result, 'error');
  assert.ok(!serialized.includes('payload'));
  assert.ok(!serialized.includes('cliente@example.com'));
  assert.ok(!serialized.includes('example.com'));
  assert.ok(!serialized.includes('sk_test_'));
});
