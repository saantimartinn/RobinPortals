const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function handler(session, identity, catalogue) {
  const filename = path.resolve(__dirname, '../backend/functions/partners-list.js'), localRequire = createRequire(filename), module = { exports: {} };
  const rows = catalogue || [{ id: 'legacy' }, { id: 'full', products: ['community'] }, { id: 'arrival', products: ['pack_llegada'] }, { id: 'shared', products: ['community', 'pack_llegada'] }];
  let accessed = false;
  const mocks = {
    '../lib/auth': { readSessionFromEvent: () => session },
    '../lib/arrival-access': { readArrivalIdentity: async () => identity },
    '../lib/application-permissions': { readApplicationIdentity: async () => identity },
    '../lib/supabase': { getSupabase: () => { accessed = true; return { from: () => ({ select() { return this; }, eq(key, value) { assert.equal(key, 'active'); assert.equal(value, true); return this; }, order: async () => ({ data: rows }) }) }; } },
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console: { error() {} }, process, require: id => mocks[id] || localRequire(id) }, { filename });
  return { send: () => module.exports.handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { products: 'community', user_id: 'untrusted' } }), accessed: () => accessed };
}

test('partners are filtered on the server for Llegada and Community; legacy records retain their audience', async () => {
  for (const [auth_source, expected] of [['application_arrival', ['arrival', 'shared']], ['application_sso', ['legacy', 'full', 'shared']]]) {
    const fixture = handler({ uid: 'user', role: 'subscriber', auth_source }, { id: 'user', arrival_pack: { contracted: true } });
    const response = await fixture.send();
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body).partners.map(row => row.id), expected);
  }
});

test('revoked or switched Arrival identities cannot read partners and unauthenticated requests stay denied', async () => {
  for (const session of [null, { uid: 'user', role: 'subscriber', auth_source: 'application_arrival' }]) {
    const fixture = handler(session, null);
    assert.equal((await fixture.send()).statusCode, 401);
    assert.equal(fixture.accessed(), false);
  }
});

test('a Community subscriber with a verified Llegada product keeps both audiences; account switches cannot grant it', async () => {
  const session = { uid: 'subscriber', role: 'subscriber', auth_source: 'application_sso', application_uid: 'portal-user' };
  const granted = await handler(session, { id: 'portal-user', arrival_pack: { contracted: true } }).send();
  assert.deepEqual(JSON.parse(granted.body).partners.map(row => row.id), ['legacy', 'full', 'arrival', 'shared']);
  const denied = await handler(session, { id: 'another-user', arrival_pack: { contracted: true } }).send();
  assert.deepEqual(JSON.parse(denied.body).partners.map(row => row.id), ['legacy', 'full', 'shared']);
});

test('Llegada presentation runs after access filtering while Community and administrators retain the original catalogue', async () => {
  const rows = [{ id: 'r', name: 'Revolut', products: ['community', 'pack_llegada'], contact_url: 'https://www.revolut.com/' }, { id: 'hidden', name: 'Translayte', products: ['community'], contact_url: 'https://translayte.com/' }, { id: 't', name: 'The Social Hub', products: ['pack_llegada'], contact_url: 'https://www.thesocialhub.co/' }];
  const arrival = handler({ uid: 'user', role: 'subscriber', auth_source: 'application_arrival' }, { id: 'user', arrival_pack: { contracted: true } }, rows);
  const limited = JSON.parse((await arrival.send()).body).partners;
  assert.deepEqual(limited.map(p => p.id), ['r', 't']);
  for (const partner of limited) { assert.equal(partner.contact_url, null); assert.ok(partner.arrival_description); assert.equal(partner.link_unavailable, true); }
  const full = handler({ uid: 'subscriber', role: 'subscriber', auth_source: 'application_sso', application_uid: 'user' }, { id: 'user', arrival_pack: { contracted: true } }, rows);
  assert.deepEqual(JSON.parse((await full.send()).body).partners, rows);
  const admin = handler({ uid: 'admin', role: 'subscriber_admin' }, null, rows);
  assert.deepEqual(JSON.parse((await admin.send()).body).partners, rows);
});
