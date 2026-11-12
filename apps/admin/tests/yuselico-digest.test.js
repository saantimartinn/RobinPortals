const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDigest, isMadridFridayNine, sendYuselicoDigest } = require('../lib/yuselico-digest');

test('Yuselico digest separates this week from older leads and lists names only', () => {
  const leads = [
    { name: 'Histórico', source_created_at: '2026-11-05T10:00:00Z' },
    { name: 'Nuevo', source_created_at: '2026-11-10T17:00:00Z' },
    { name: 'Siguiente semana', source_created_at: '2026-11-13T08:00:00Z' },
    { name: 'Prueba', source_created_at: '2026-11-10T17:00:00Z', is_test: true },
  ];
  const digest = buildDigest(leads, new Date('2026-11-12T12:00:00Z'));
  assert.equal(digest.week, '2026-11-13');
  assert.equal(digest.newCount, 1);
  assert.equal(digest.historicalCount, 1);
  assert.match(digest.text, /Nuevos \(1\)\n- Nuevo/);
  assert.match(digest.text, /Históricos \(1\)\n- Histórico/);
  assert.doesNotMatch(digest.text, /Prueba|Siguiente semana|2026-/);
});

test('Friday 09:00 Europe/Madrid moves between 07:00 and 08:00 UTC with daylight saving', () => {
  assert.equal(isMadridFridayNine(new Date('2026-07-10T07:00:00Z')), true);
  assert.equal(isMadridFridayNine(new Date('2026-07-10T08:00:00Z')), false);
  assert.equal(isMadridFridayNine(new Date('2026-11-13T07:00:00Z')), false);
  assert.equal(isMadridFridayNine(new Date('2026-11-13T08:00:00Z')), true);
});

test('the weekly boundary stays at Madrid 09:00 across the clock change', () => {
  const digest = buildDigest([
    { name: 'Antes', source_created_at: '2026-10-23T06:59:59Z' },
    { name: 'Dentro', source_created_at: '2026-10-23T07:00:00Z' },
    { name: 'Después', source_created_at: '2026-10-30T08:00:00Z' },
  ], new Date('2026-10-30T08:00:00Z'));
  assert.equal(digest.newCount, 1);
  assert.equal(digest.historicalCount, 1);
  assert.match(digest.text, /- Dentro/);
  assert.doesNotMatch(digest.text, /Después/);
});

test('the scheduled message selects only Yuselico leads and uses a weekly idempotency key', async () => {
  const leads = [{ name: 'David', source_created_at: '2026-11-10T17:00:00Z' }];
  const db = {
    from(table) {
      assert.equal(table, 'crm_leads');
      return {
        select() { return this; },
        contains(column, value) { assert.equal(column, 'source_payload'); assert.deepEqual(value, { tag: 'yuselico-studios' }); return this; },
        order() { return this; },
        async range() { return { data: leads, error: null }; },
      };
    },
  };
  let message;
  const result = await sendYuselicoDigest({
    to: 'yuselicostudio@gmail.com', now: new Date('2026-11-13T08:00:00Z'), db,
    mailer: async (input) => { message = input; return { sent: true, id: 'message-1' }; },
  });
  assert.equal(message.to, 'yuselicostudio@gmail.com');
  assert.equal(message.idempotencyKey, 'yuselico-weekly-2026-11-13');
  assert.equal(message.text.includes('David'), true);
  assert.deepEqual({ newCount: result.newCount, historicalCount: result.historicalCount }, { newCount: 1, historicalCount: 0 });
});
