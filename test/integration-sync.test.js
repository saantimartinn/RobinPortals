// Automated checks for integration sync test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const { queueRetry } = require('../lib/integration-sync');
const { loadPendingJobs } = require('../netlify/functions/integration-retry');

test('la cola persiste solo identificadores mínimos y estado pending', async () => {
  let inserted;
  const sb = { from: (table) => ({ insert: async (row) => {
    assert.equal(table, 'webhook_log');
    inserted = row;
    return { error: null };
  } }) };
  const result = await queueRetry(sb, {
    integration: 'google_sheets', operation: 'upsert_client', payload: { user_id: 'u1' }, error: new Error('timeout'),
  });
  assert.equal(result.queued, true);
  assert.equal(inserted.result, 'pending');
  assert.equal(inserted.payload.user_id, 'u1');
  assert.equal(inserted.payload.attempts, 0);
  assert.equal(Object.hasOwn(inserted.payload, 'email'), false);
});

test('el cron carga pendientes por created_at, la columna real de webhook_log', async () => {
  const calls = [];
  const expected = [{ id: 'job-1', payload: { integration: 'google_sheets' } }];
  const sb = {
    from(table) {
      calls.push(['from', table]);
      return {
        select(columns) {
          calls.push(['select', columns]);
          return this;
        },
        eq(column, value) {
          calls.push(['eq', column, value]);
          return this;
        },
        order(column, options) {
          calls.push(['order', column, options]);
          return this;
        },
        async limit(value) {
          calls.push(['limit', value]);
          return { data: expected, error: null };
        },
      };
    },
  };

  assert.deepEqual(await loadPendingJobs(sb), expected);
  assert.deepEqual(calls, [
    ['from', 'webhook_log'],
    ['select', 'id, payload'],
    ['eq', 'source', 'integration_retry'],
    ['eq', 'result', 'pending'],
    ['order', 'created_at', { ascending: true }],
    ['limit', 20],
  ]);
});
