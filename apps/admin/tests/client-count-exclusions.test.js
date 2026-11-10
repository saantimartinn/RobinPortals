const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSalesDashboard } = require('../lib/sales-dashboard');

test('excludes Noel and Marta from the client total and chart across conversion sources', async (t) => {
  const ids = [
    'e8438ed6-0836-40b6-8fac-a2fb2bfeeba2',
    '365a2045-718e-43d7-a40f-6cf91bfc4a89',
    'ordinary-client',
  ];
  const date = '2026-10-16T10:00:00.000Z';
  for (const source of ['signature', 'crm', 'historical']) {
    await t.test(source, () => {
      const users = ids.map((id, index) => ({
        id,
        lead_id: `lead-${index}`,
        email: `client-${index}@example.com`,
        nombre: 'Noel',
        contract_signed_at: source === 'signature' ? date : null,
      }));
      const leads = source === 'crm' ? users.map((user) => ({
        id: user.lead_id,
        email: user.email,
        source_created_at: date,
        inside_at: date,
        crm_stage: 'Cliente',
        source_payload: { source: 'website' },
      })) : [];
      const historicalFacts = source === 'historical' ? users.map((user, index) => ({
        id: `historical-${index}`,
        portal_user_id: user.id,
        acquired_at: date,
        client_at: date,
        is_client: true,
        channel: 'organic',
      })) : [];
      const result = buildSalesDashboard({
        period: 'custom',
        bounds: {
          id: 'custom',
          start: new Date('2026-10-01T00:00:00.000Z'),
          end: new Date('2026-11-01T00:00:00.000Z'),
          granularity: 'month',
        },
        users, leads, historicalFacts, payments: [],
        marketingExpense: 0, marketingAvailable: false,
        metaCampaigns: [], metaAvailable: false,
      });

      assert.equal(result.acquisition.newClients, 1);
      assert.equal(result.acquisition.buckets.length, 1);
      assert.equal(result.acquisition.buckets[0].clients, 1);
    });
  }
});
