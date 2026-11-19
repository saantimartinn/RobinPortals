const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const auth = require('../backend/lib/auth');
const { ARRIVAL_TABS, canOpenTab, visibleFaqs } = require('../shared/product-access.cjs');
process.env.JWT_SECRET = 'arrival-tests-only-not-a-real-secret';

function load(file, mocks) {
  const filename = path.resolve(__dirname, '..', file), localRequire = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, process, Buffer, console: { error() {} }, require: name => mocks[name] || localRequire(name) }, { filename });
  return module.exports;
}
const identity = { id: 'portal-user', role: 'client', email: 'client@example.test', nombre: 'Cliente', arrival_pack: { contracted: true, first_payment_completed: true, calls_enabled: true, status: 'active' } };
const session = { uid: identity.id, role: 'subscriber', auth_source: 'application_arrival' };

test('SSO reuses the common identity without creating a subscriber; a paid Community plan wins', async () => {
  for (const subscriber of [null, { id: 'existing', role: 'subscriber', subscription_status: 'canceled' }, { id: 'existing', role: 'subscriber', subscription_status: 'active' }]) {
    let signed;
    const handler = load('backend/functions/auth-sso.js', {
      '../lib/application-permissions': { readApplicationIdentity: async () => identity, canUseRobinPlan: () => false },
      '../lib/auth': { signSession: user => { signed = { ...user }; return 'signed'; }, buildSessionCookie: () => 'cookie' },
      '../lib/supabase': { getSupabase: () => ({ from(table) { assert.equal(table, 'subscribers'); return { select() { return this; }, eq() { return this; }, limit: async () => ({ data: subscriber ? [subscriber] : [] }) }; } }) },
    }).handler;
    assert.equal((await handler({ httpMethod: 'POST', headers: {}, body: '{"role":"subscriber_admin"}' })).statusCode, 200);
    const full = subscriber?.subscription_status === 'active';
    assert.equal(signed.auth_source, full ? 'application_sso' : 'application_arrival');
    assert.equal(signed.id, full ? 'existing' : identity.id);
    if (full) assert.equal(signed.application_uid, identity.id);
  }
});

test('unsigned/unrelated identities cannot activate Llegada by supplying body fields', async () => {
  const handler = load('backend/functions/auth-sso.js', {
    '../lib/application-permissions': { readApplicationIdentity: async () => ({ id: 'other', role: 'client' }), canUseRobinPlan: () => false },
    '../lib/supabase': { getSupabase: () => ({ from: () => ({ select() { return this; }, eq() { return this; }, limit: async () => ({ data: [] }) }) }) },
  }).handler;
  assert.equal((await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(identity) })).statusCode, 403);
});

test('the restricted cookie is rejected by all ordinary protected Community APIs', async () => {
  const token = auth.signSession({ id: identity.id, role: 'subscriber', auth_source: 'application_arrival' });
  const event = { httpMethod: 'GET', headers: { cookie: `${auth.COOKIE_NAME}=${token}` }, body: '{}' };
  assert.equal(auth.readSessionFromEvent(event), null);
  assert.equal(auth.readSessionFromEvent(event, { allowArrival: true }).uid, identity.id);
  for (const name of ['social', 'messages', 'challenges', 'community-events-list', 'community-rsvp', 'subscriber-cv-ai', 'subscriber-profile-update', 'subscription-checkout', 'subscription-cancel', 'subscription-portal', 'subscription-sync', 'subscription-plans', 'sub-admin-data', 'sub-admin-database']) {
    const handler = require(`../backend/functions/${name}.js`).handler;
    const response = await handler({ ...event, httpMethod: ['community-rsvp', 'subscriber-cv-ai', 'subscriber-profile-update', 'subscription-checkout', 'subscription-cancel', 'subscription-portal'].includes(name) ? 'POST' : 'GET' });
    assert.ok([401, 405].includes(response.statusCode), `${name}: ${response.statusCode}`);
  }
  const bad = auth.signSession({ id: identity.id, role: 'subscriber_admin', auth_source: 'application_arrival' });
  assert.equal(auth.readSessionFromEvent({ headers: { cookie: `${auth.COOKIE_NAME}=${bad}` } }, { allowArrival: true }), null);
});

test('permitted Llegada APIs revalidate common identity and current product, including account switches', async () => {
  for (const current of [identity, { ...identity, id: 'another-client' }, { ...identity, arrival_pack: null }, { ...identity, is_application_admin: true }, { ...identity, auth_source: 'external_client' }]) {
    const { readArrivalIdentity } = load('backend/lib/arrival-access.js', { './application-permissions': { readApplicationIdentity: async () => current } });
    assert.equal(!!await readArrivalIdentity({}, session), current === identity);
  }
  const handler = load('backend/functions/me.js', {
    '../lib/auth': { readSessionFromEvent: () => session },
    '../lib/arrival-access': { readArrivalIdentity: async () => identity, arrivalUser: require('../backend/lib/arrival-access').arrivalUser },
    '../lib/supabase': { getSupabase: () => assert.fail('Llegada must not query/create a Community account') },
  }).handler;
  const response = await handler({ httpMethod: 'GET', headers: {} });
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).community_access, 'arrival');
});

test('tab policy blocks direct URLs to premium modules without reducing full access', () => {
  const user = { community_access: 'arrival' };
  assert.deepEqual(ARRIVAL_TABS, ['home', 'llamadas', 'partners', 'pagos', 'soporte', 'faqs', 'ajustes']);
  for (const tab of ['personal', 'profesional', 'comunidad', 'social', 'beneficios', 'acelerar', 'perfil', 'unknown']) assert.equal(canOpenTab(user, tab), false);
  for (const tab of ARRIVAL_TABS) assert.equal(canOpenTab(user, tab), true);
  assert.equal(canOpenTab({ community_access: 'full', arrival_pack: identity.arrival_pack }, 'comunidad'), true);
});

test('FAQs are explicitly scoped; legacy subscription answers are never disclosed to Llegada', async () => {
  const rows = [
    { id: 'legacy' }, { id: 'full', products: ['community'] },
    { id: 'arrival', products: ['pack_llegada'] }, { id: 'shared', products: ['community', 'pack_llegada'] },
  ];
  assert.deepEqual(visibleFaqs(rows, true).map(row => row.id), ['arrival', 'shared']);
  assert.deepEqual(visibleFaqs(rows, false).map(row => row.id), ['legacy', 'full', 'shared']);
  assert.deepEqual(visibleFaqs([rows[3], rows[2]], true).map(row => row.id), ['arrival', 'shared']);
  assert.deepEqual(visibleFaqs(rows, false, true).map(row => row.id), ['arrival', 'legacy', 'full', 'shared']);
  const query = { select() { return this; }, order() { return this; }, eq() { return this; }, then(resolve) { resolve({ data: rows }); } };
  const handler = load('backend/functions/faqs.js', {
    '../lib/auth': { readSessionFromEvent: () => session },
    '../lib/arrival-access': { readArrivalIdentity: async () => identity },
    '../lib/supabase': { getSupabase: () => ({ from: () => query }) },
  }).handler;
  const response = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { product: 'community' } });
  assert.deepEqual(JSON.parse(response.body).faqs.map(row => row.id), ['arrival', 'shared']);
  assert.equal((await handler({ httpMethod: 'POST', headers: {}, body: '{}' })).statusCode, 403);
});

test('Llegada support scopes ownership to Portal ID and rejects premium service requests', async () => {
  const filters = [], inserts = [];
  const handler = load('backend/functions/service-requests.js', {
    '../lib/auth': { readSessionFromEvent: () => session },
    '../lib/arrival-access': { readArrivalIdentity: async () => identity },
    '../lib/email': { sendEmail: async () => ({ sent: true }) },
    '../lib/supabase': { getSupabase: () => ({ from(table) { return {
      select() { return this; }, eq(key, value) { filters.push([key, value]); return this; },
      order: async () => ({ data: [] }), insert(row) { inserts.push([table, row]); return this; },
      single: async () => ({ data: { id: 'request' } }), then(resolve) { resolve({ data: [] }); },
    }; } }) },
  }).handler;
  assert.equal((await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { user_id: 'victim' } })).statusCode, 200);
  assert.deepEqual(filters, [['portal_user_id', identity.id]]);
  for (const body of [{ title: 'Premium', service_key: 'cv' }, { title: 'Premium', category: 'mentorias' }]) {
    assert.equal((await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) })).statusCode, 403);
  }
  assert.equal(inserts.length, 0);
  const response = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ title: 'Ayuda con mi pack', category: 'soporte', user_id: 'victim', portal_user_id: 'victim' }) });
  assert.equal(response.statusCode, 200);
  assert.equal(inserts[0][1].portal_user_id, identity.id);
  assert.equal(inserts[0][1].user_id, undefined);
  assert.equal(inserts[0][1].service_key, null);
});
