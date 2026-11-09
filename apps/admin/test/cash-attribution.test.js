const test = require('node:test');
const assert = require('node:assert/strict');
const { attributionForUser } = require('../../../packages/cash-sheet/attribution.cjs');
const { acquisition } = require('../../../packages/cash-sheet/rows.cjs');

test('recupera el origen del CRM en un reintento sin datos de conversión', async () => {
  const queried = [];
  const crm = { from(table) { assert.equal(table, 'crm_leads'); return {
    select(columns) { assert.equal(columns, 'source_payload'); return this; },
    eq(column, value) { queried.push([column, value]); return this; },
    async maybeSingle() { return { data: { source_payload: { source: 'meta', campaign_name: 'Webinar 21-21' } }, error: null }; },
  }; } };
  const payload = await attributionForUser({ lead_id: '2042' }, undefined, crm);
  assert.deepEqual(queried, [['notion_numeric_id', 2042]]);
  assert.deepEqual(acquisition(payload), { channel: 'Meta', campaign: 'Webinar 21-21' });
});

test('busca los leads nativos por UUID y recupera la campaña Meta', async () => {
  const id = '344f28f5-b527-48d1-ac36-7a63d43dd20c';
  const queried = [];
  const crm = { from() { return {
    select() { return this; },
    eq(column, value) { queried.push([column, value]); return this; },
    async maybeSingle() { return { data: { source_payload: { source: 'website', ad_id: 'ad-1', campaign_name: 'Webinar 10-10' } }, error: null }; },
  }; } };
  const payload = await attributionForUser({ lead_id: id }, undefined, crm);
  assert.deepEqual(queried, [['id', id]]);
  assert.deepEqual(acquisition(payload), { channel: 'Meta', campaign: 'Webinar 10-10' });
});

test('respeta el origen ya proporcionado y reconoce los canales del CRM', async () => {
  const supplied = { source: 'referido' };
  assert.equal(await attributionForUser({ lead_id: '2042' }, supplied), supplied);
  assert.deepEqual(acquisition(supplied), { channel: 'Referido', campaign: '' });
  assert.deepEqual(acquisition({ source: 'rrss' }), { channel: 'RRSS', campaign: '' });
  assert.deepEqual(acquisition({ source: 'website', utm_source: 'meta', utm_campaign: 'Landing 21-21' }),
    { channel: 'Meta', campaign: 'Landing 21-21' });
  assert.deepEqual(acquisition({ source: 'notion', campaign_id: '123' }), { channel: 'Meta', campaign: 'NA' });
});
