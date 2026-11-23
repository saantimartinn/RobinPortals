const test = require('node:test');
const assert = require('node:assert/strict');
const portal = require('../../apps/portal/lib/google-sheets');
const admin = require('../../apps/admin/lib/google-sheets');
const junior = require('../../apps/robinjr/lib/google-sheets');
const { GENERAL_PRICE_VERSION, DELFT_PRICE_VERSION } = require('../../apps/portal/shared/financial-config.cjs');
const { ROBIN_JR_PRICE_VERSION } = require('../../apps/robinjr/shared/financial-config.cjs');

const arrival = { id: 'cash-user', lead_id: 'cash-lead', nombre: 'Cash', assigned_to: 'manuel@project-robin.com', tipo: 'llegada', contract_signed: true, pago_completed: true };
const amounts = row => [row.pago1, row.pago2, row.pago3];
const states = row => [row.estado1, row.estado2, row.estado3];

for (const [name, sheets] of [['Portal', portal], ['Admin', admin]]) {
  test(`${name}: el contrato aporta importes sin inventar cobros aunque el onboarding esté marcado como pagado`, () => {
    const row = sheets.buildRow(arrival, []);
    assert.deepEqual(amounts(row), [850, 850, 0]);
    assert.deepEqual(states(row), ['No', 'No', 'No']);
    assert.equal(row.totalPagado, 0);
    assert.equal(row.cobroInicial, 1700);
    assert.equal(row.restante, 1700);
  });

  test(`${name}: respeta la versión firmada, el número de aplicaciones y las tarifas vigentes`, () => {
    const general = { ...arrival, tipo: 'general', num_carreras: 2, contract_data: { pricing_version: GENERAL_PRICE_VERSION } };
    assert.deepEqual(amounts(sheets.buildRow(general, [])), [666.33, 866.33, 866.34]);
    assert.deepEqual(amounts(sheets.buildRow({ ...general, contract_data: {} }, [])), [566.67, 716.67, 716.66]);
    const delft = { ...arrival, tipo: 'delft', contract_data: { pricing_version: DELFT_PRICE_VERSION } };
    assert.deepEqual(amounts(sheets.buildRow(delft, [])), [999, 1000, 1000]);
    assert.deepEqual(amounts(sheets.buildRow({ ...delft, contract_data: {} }, [])), [933, 933, 933]);
  });

  test(`${name}: conserva los importes ajustados y cuenta solo pagos reales, incluyendo extras`, () => {
    const payments = Object.freeze([
      Object.freeze({ installment: 1, amount: 500, status: 'paid' }),
      Object.freeze({ installment: 2, amount: 375, status: 'unlocked', payment_data: { amount_custom: true } }),
      Object.freeze({ installment: 4, amount: 75, status: 'locked' }),
      Object.freeze({ installment: 5, amount: 100, status: 'paid', payment_data: { annulled_at: '2026-11-23T12:00:00Z' } }),
    ]);
    const row = sheets.buildRow(arrival, payments);
    assert.deepEqual(amounts(row), [500, 375, 0]);
    assert.deepEqual(states(row), ['Si', 'No', 'No']);
    assert.equal(row.totalPagado, 500);
    assert.equal(row.cobroInicial, 950);
    assert.equal(row.restante, 450);
    const missingSecond = sheets.buildRow(arrival, [payments[0]]);
    assert.deepEqual(amounts(missingSecond), [500, 850, 0]);
    assert.equal(missingSecond.restante, 850);
    const customThird = sheets.buildRow(arrival, [{ installment: 3, amount: 50, status: 'unlocked' }]);
    assert.deepEqual(amounts(customThird), [850, 850, 50]);
    assert.equal(customThird.restante, 1750);
  });

  test(`${name}: aplica el crédito contractual de mentoría y el saldo LATAM sin alterar estados`, () => {
    const upgrade = { ...arrival, contract_data: { mentoria_upgrade: { target_type: 'llegada', credit_eur: 666.33 } } };
    assert.deepEqual(amounts(sheets.buildRow(upgrade, [])), [183.67, 850, 0]);
    assert.deepEqual(states(sheets.buildRow(upgrade, [])), ['No', 'No', 'No']);
    const international = { ...arrival, tipo: 'general', origin: 'latam', pais: 'México', has_eu_id: false };
    const row = sheets.buildRow(international, [{ installment: 1, amount: 600, status: 'paid' }]);
    assert.deepEqual(amounts(row), [600, 1050, 1050]);
    assert.equal(row.restante, 2100);
  });
}

test('Admin usa el plan específico de Robin Jr, incluidos precios especiales', () => {
  const user = { ...arrival, tipo: 'general', contract_data: { pricing_version: ROBIN_JR_PRICE_VERSION } };
  assert.deepEqual(amounts(admin.buildRow(user, [], { portalKind: 'robinjr' })), [500, 500, 499]);
  assert.deepEqual(amounts(junior.buildRow(user, [])), [500, 500, 499]);
  const special = { ...user, contract_data: { special_price_total_eur: 899 } };
  assert.deepEqual(amounts(admin.buildRow(special, [], { portalKind: 'robinjr' })), [899, 0, 0]);
});

test('sincronizar CASH solo lee pagos; un error de lectura no permite exportar ceros', async t => {
  const oldFetch = global.fetch;
  const keys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_SHEETS_SPREADSHEET_ID'];
  const oldEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) process.env[key] = 'cash-audit';
  t.after(() => {
    global.fetch = oldFetch;
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const reply = data => new Response(JSON.stringify(data), { status: 200 });
  const writes = [];
  global.fetch = async (url, options = {}) => {
    const text = decodeURIComponent(String(url));
    if (text.includes('oauth2.googleapis.com')) return reply({ access_token: 'cash-audit', expires_in: 3600 });
    assert.ok(text.includes('/cash-audit'), 'No live spreadsheet requests');
    if (text.includes('?fields=sheets')) return reply({ sheets: [
      { properties: { sheetId: 2041257143, title: 'Reduced' } },
      { properties: { sheetId: 288896043, title: 'Complete' } },
    ] });
    if (text.includes('values:batchUpdate')) { writes.push(...JSON.parse(options.body).data); return reply({}); }
    if (text.endsWith(':batchUpdate')) return reply({});
    const header = Array(28).fill(''); header[0] = 'Asesor';
    if (text.includes("'Reduced'")) header[13] = 'Contrato';
    else { header[19] = 'Contrato'; header[22] = 'Canal de captación'; header[23] = 'Campaña'; header[24] = 'Mercado'; }
    return reply({ values: [header, []] });
  };
  let paymentError = null;
  const db = { from(table) {
    assert.ok(['users', 'payments'].includes(table));
    return {
      select() { return this; }, eq() { return this; },
      single: async () => ({ data: arrival, error: null }),
      order: async () => ({ data: paymentError ? null : [], error: paymentError }),
      insert() { assert.fail('CASH must not create payments'); },
      update() { assert.fail('CASH must not mark installments paid'); },
    };
  } };
  for (const sheets of [portal, admin, junior]) {
    writes.length = 0;
    const result = await sheets.upsertClientRow(db, arrival.id, { attribution: { source: 'website' } });
    assert.equal(result.ok, true, result.reason);
    const row = writes.find(write => write.range === "'Reduced'!A2:I2").values[0];
    assert.equal(row[3], sheets === junior ? 500 : 850);
    assert.equal(row[4], 'No');
    paymentError = { message: 'payments_read_failed' };
    writes.length = 0;
    const failed = await sheets.upsertClientRow(db, arrival.id, { attribution: { source: 'website' } });
    assert.equal(failed.ok, false);
    assert.equal(failed.reason, 'payments_read_failed');
    assert.equal(writes.length, 0);
    paymentError = null;
  }
});
