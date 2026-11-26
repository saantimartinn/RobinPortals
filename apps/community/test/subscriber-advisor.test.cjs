const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const { memoryDatabase } = require('../../../dev/fixtures/collaboration-db.cjs');
const { claimSubscriber } = require('../backend/lib/subscriber-advisor');
const admin = { email: 'ana@example.test', role: 'admin', is_application_admin: true };
const another = { email: 'bruno@example.test', role: 'admin', is_application_admin: true };
const client = { id: '11111111-1111-4111-8111-111111111111', role: 'subscriber', is_subscriber: true, assigned_to: null, nombre: 'Nora' };

function handler(db, actor = admin, session = { role: 'subscriber_admin' }) {
  const filename = resolve(__dirname, '../backend/functions/sub-admin-mutate.js');
  const realRequire = createRequire(filename);
  const module = { exports: {} };
  const mocks = {
    '../lib/supabase': { getSupabase: () => db },
    '../lib/auth': { readSessionFromEvent: () => session },
    '../lib/application-permissions': { readApplicationIdentity: async () => actor, canUseRobinPlan: identity => identity?.is_application_admin === true },
  };
  vm.runInNewContext(readFileSync(filename, 'utf8'), { module, exports: module.exports, require: id => mocks[id] || realRequire(id), console, process, Buffer }, { filename });
  return module.exports.handler;
}
const request = payload => ({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ entity: 'user', action: 'claim', payload: { id: client.id, ...payload } }) });

test('un administrador normal toma un cliente libre como propio, sin compartirlo con su PRO', async () => {
  const db = memoryDatabase({ subscribers: [client], admin_links: [{ admin_id: 'ana', pro_admin_id: 'manuel' }], admin_client_shares: [] });
  const response = await handler(db)(request({ assigned_to: 'manuel@project-robin.com', nombre: 'No modificar' }));
  assert.equal(response.statusCode, 200);
  assert.equal(db.tables.subscribers[0].assigned_to, admin.email);
  assert.equal(db.tables.subscribers[0].nombre, 'Nora');
  assert.equal(db.tables.admin_client_shares.length, 0);
  assert.equal(db.tables.admin_links.length, 1);
  assert.equal((await handler(db)(request())).statusCode, 200, 'repetir la acción propia es idempotente');
});

test('dos administradores que reclaman a la vez no pueden obtener el mismo cliente', async () => {
  const db = memoryDatabase({ subscribers: [client] });
  const result = await Promise.allSettled([claimSubscriber(db, admin, client.id), claimSubscriber(db, another, client.id)]);
  assert.equal(result.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(result.find(item => item.status === 'rejected').reason.statusCode, 409);
  assert.equal(db.tables.subscribers[0].assigned_to, admin.email);
});

test('tomar un cliente no permite apropiarse de clientes ya asignados, tampoco a un PRO', async () => {
  const db = memoryDatabase({ subscribers: [{ ...client, assigned_to: another.email }] });
  for (const actor of [admin, { ...admin, email: 'manuel@project-robin.com' }]) {
    const response = await handler(db, actor)(request());
    assert.equal(response.statusCode, 409);
    assert.equal(JSON.parse(response.body).error, 'client_already_assigned');
    assert.equal(db.tables.subscribers[0].assigned_to, another.email);
  }
});

test('tomar clientes requiere ambas sesiones de administración y acceso a Community', async () => {
  const db = { from() { throw new Error('no debe acceder a la base de datos'); } };
  assert.equal((await handler(db, admin, null)(request())).statusCode, 401);
  assert.equal((await handler(db, admin, { role: 'subscriber' })(request())).statusCode, 403);
  assert.equal((await handler(db, null)(request())).statusCode, 403);
  await assert.rejects(claimSubscriber(db, { email: 'cliente@example.test', role: 'subscriber' }, client.id), { statusCode: 403 });
});

test('no se pueden tomar administradores ni identificadores inexistentes o inválidos', async () => {
  const db = memoryDatabase({ subscribers: [{ ...client, role: 'subscriber_admin' }] });
  assert.equal((await handler(db)(request())).statusCode, 404);
  assert.equal((await handler(db)(request({ id: '22222222-2222-4222-8222-222222222222' }))).statusCode, 404);
  assert.equal((await handler(db)(request({ id: 'invalid' }))).statusCode, 400);
});
