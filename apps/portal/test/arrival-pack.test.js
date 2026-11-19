const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { arrivalPackForUser, SERVICE_END } = require('../shared/arrival-pack.cjs');
const { applicationPlanForUser } = require('../shared/financial-config.cjs');
const user = { id: 'arrival-client', email: 'arrival@example.test', role: 'client', tipo: 'llegada', contract_signed: true, pago_completed: true, contract_data: { variant: 'llegada' } };
function load(name, mocks) {
  const filename = path.resolve(__dirname, '../netlify/functions', name + '.js'), localRequire = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, process, Buffer, Date, console: { error() {} }, require: id => mocks[id] || localRequire(id) }, { filename });
  return module.exports.handler;
}

test('Pack Llegada derives from the signed product; unrelated roles, unsigned and other contracts are excluded', () => {
  for (const patch of [{ tipo: 'general' }, { contract_signed: false }, { role: 'admin' }, { auth_source: 'external_client' }, { contract_data: { variant: 'general_noes' } }]) assert.equal(arrivalPackForUser({ ...user, ...patch }), null);
  const pack = arrivalPackForUser(user, Date.parse('2026-11-19'));
  assert.equal(pack.calls_enabled, true);
  assert.equal(arrivalPackForUser({ ...user, pago_completed: false }, Date.parse('2026-11-19')).calls_enabled, false);
  assert.equal(arrivalPackForUser(user, Date.parse(SERVICE_END)).status, 'ended');
  assert.equal(arrivalPackForUser({ ...user, contract_data: { ...user.contract_data, arrival_service_end_at: '2028-09-15T00:00:00+02:00' } }, Date.parse('2028-01-01')).calls_enabled, true);
});

test('current contractual installments are 850 + 850; a real mentorship credit affects only the first', () => {
  assert.deepEqual(applicationPlanForUser(user).map(row => row.amount), [850, 850]);
  assert.deepEqual(applicationPlanForUser({ ...user, contract_data: { ...user.contract_data, mentoria_upgrade: { target_type: 'llegada', credit_eur: 666.33 } } }).map(row => row.amount), [183.67, 850]);
});

test('Arrival billing reads actual owned rows without inserting, repricing or manufacturing paid rows', async () => {
  for (const payments of [[], [{ id: 'p1', installment: 1, amount: 183.67, status: 'paid', paid_at: '2026-11-01' }, { id: 'p2', installment: 2, amount: 999, status: 'unlocked' }, { id: 'extra', installment: 4, amount: 450, status: 'paid' }]]) {
    const filters = [];
    const handler = load('payments-list', {
      '../../lib/auth': { readSessionFromEvent: () => ({ uid: user.id }) },
      '../../lib/payments': { ensurePayments: () => assert.fail('must not create/reprice payments'), invoiceNumber: () => 'existing' },
      '../../lib/supabase': { getSupabase: () => ({ from(table) { return { select() { return this; }, eq(key, value) { filters.push([table, key, value]); return this; }, single: async () => ({ data: user }), order: async () => ({ data: payments }) }; } }) },
    });
    const response = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { product: 'llegada', user_id: 'victim' } });
    assert.equal(response.statusCode, 200);
    const data = JSON.parse(response.body);
    assert.deepEqual(data.payments.map(row => row.amount), payments.map(row => row.amount));
    assert.deepEqual(data.contract_plan.map(row => row.amount), [850, 850]);
    assert.ok(filters.every(([, , id]) => id === user.id));
  }
});

test('Llegada checkout never creates missing billing records or accepts unrelated products', async () => {
  let orders = 0;
  for (const actual of [user, { ...user, tipo: 'general' }]) {
    const handler = load('payments-checkout', {
      '../../lib/auth': { readSessionFromEvent: () => ({ uid: user.id }) },
      '../../lib/payments': { ensurePayments: () => assert.fail('must not create payments') },
      '../../lib/payment-provider': { name: () => 'revolut', isConfigured: () => true },
      '../../lib/revolut': { createOrder: () => { orders++; assert.fail('no payable record'); } },
      '../../lib/supabase': { getSupabase: () => ({ from(table) { return { select() { return this; }, eq() { return this; }, single: async () => ({ data: table === 'users' ? actual : null }) }; } }) },
    });
    const response = await handler({ httpMethod: 'POST', headers: {}, body: '{"installment":2,"product":"llegada","user_id":"victim"}' });
    assert.equal(response.statusCode, actual === user ? 404 : 403);
  }
  assert.equal(orders, 0);
});

test('booking enforces initial payment and service period before any Calendar operation', async () => {
  for (const actual of [{ ...user, pago_completed: false }, { ...user, contract_signed: false }, { ...user, contract_data: { variant: 'llegada', arrival_service_end_at: '2026-01-01T00:00:00Z' } }]) {
    const handler = load('bookings-create', {
      '../../lib/auth': { readSessionFromEvent: () => ({ uid: user.id }) },
      '../../lib/supabase': { getSupabase: () => ({ from: () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: actual }) }) }) },
      '../../lib/google-calendar': { listEvents: () => assert.fail('must not consult Calendar'), createMeetEvent: () => assert.fail('must not book') },
      '../../lib/observability': { createOperationLogger: () => ({ start() {}, warn() {}, failure() {} }) },
    });
    const response = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ start_at: new Date(Date.now() + 86400000).toISOString() }) });
    assert.equal(response.statusCode, 403);
  }
});

test('paying an existing Llegada installment reuses its exact amount and returns to Community', async () => {
  let orderInput;
  const payment = { id: 'owned-payment', user_id: user.id, installment: 2, amount: 1000, currency: 'EUR', status: 'unlocked' };
  const handler = load('payments-checkout', {
    '../../lib/auth': { readSessionFromEvent: () => ({ uid: user.id }) },
    '../../lib/payments': { ensurePayments: () => assert.fail('must not reprice') },
    '../../lib/payment-provider': { name: () => 'revolut', isConfigured: () => true },
    '../../lib/payment-attempts': { createAttempt: async (_sb, input) => { assert.equal(input.paymentId, payment.id); assert.equal(input.userId, user.id); return { id: 'existing-flow-attempt' }; }, attachProviderOrder: async () => {} },
    '../../lib/revolut': { getBaseUrl: () => 'http://localhost:8888', createOrder: async input => { orderInput = input; return { id: 'order', checkout_url: 'https://checkout.example.test' }; } },
    '../../lib/supabase': { getSupabase: () => ({ from(table) { return { select() { return this; }, eq(key, value) { if (key === 'user_id') assert.equal(value, user.id); return this; }, single: async () => ({ data: table === 'users' ? user : payment }) }; } }) },
  });
  const response = await handler({ httpMethod: 'POST', headers: {}, body: '{"installment":2,"product":"llegada","user_id":"victim","amount":1}' });
  assert.equal(response.statusCode, 200);
  assert.equal(orderInput.amountMinor, 100000);
  assert.equal(orderInput.redirectUrl, 'http://localhost:8888/therobinplan/?payment_attempt=existing-flow-attempt');
});
