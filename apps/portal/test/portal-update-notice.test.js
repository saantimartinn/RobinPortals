const test = require('node:test');
const assert = require('node:assert/strict');
const { createPortalUpdateNoticeHandler } = require('../netlify/functions/portal-update-notice');

function fixture({ session = { uid: 'student' }, role = 'client', databaseError = false } = {}) {
  const users = [{ id: 'student', role, portal_update_notice_seen_at: null }, { id: 'other', role: 'client', portal_update_notice_seen_at: null }];
  const sb = { from(table) {
    assert.equal(table, 'users');
    const filters = [];
    let patch;
    return {
      select() { return this; },
      eq(key, value) { filters.push(row => row[key] === value); return this; },
      is(key, value) { filters.push(row => row[key] === value); return this; },
      update(value) { patch = value; return this; },
      async maybeSingle() {
        if (databaseError) return { data: null, error: new Error('database unavailable') };
        const row = users.find(candidate => filters.every(filter => filter(candidate)));
        if (row && patch) Object.assign(row, patch);
        return { data: row ? { ...row } : null, error: null };
      },
    };
  } };
  const handler = createPortalUpdateNoticeHandler({ getSupabase: () => sb, readSessionFromEvent: () => session });
  const call = (body = {}, options = {}) => handler({ httpMethod: 'POST', headers: { host: 'portal.test', origin: 'https://portal.test' }, body: JSON.stringify(body), ...options });
  return { call, users };
}

test('solo una petición puede mostrar el aviso, incluso desde dos dispositivos a la vez', async () => {
  const { call, users } = fixture();
  const responses = await Promise.all([call(), call()]);
  assert.deepEqual(responses.map(response => JSON.parse(response.body).show).sort(), [false, true]);
  assert.ok(users[0].portal_update_notice_seen_at);
  assert.equal(JSON.parse((await call()).body).show, false);
});

test('migra el aviso ya visto en el navegador sin volver a mostrarlo', async () => {
  const { call } = fixture();
  assert.equal(JSON.parse((await call({ already_seen: true })).body).show, false);
  assert.equal(JSON.parse((await call()).body).show, false);
});

test('la marca pertenece a la sesión y nunca a otro usuario enviado en el body', async () => {
  const { call, users } = fixture();
  assert.equal((await call({ user_id: 'other' })).statusCode, 200);
  assert.ok(users[0].portal_update_notice_seen_at);
  assert.equal(users[1].portal_update_notice_seen_at, null);
});

test('rechaza peticiones sin sesión, externas, de administración o de otro origen', async () => {
  assert.equal((await fixture({ session: null }).call()).statusCode, 401);
  assert.equal((await fixture({ session: { uid: 'student', auth_source: 'external_client' } }).call()).statusCode, 403);
  assert.equal((await fixture({ role: 'admin' }).call()).statusCode, 403);
  assert.equal((await fixture().call({}, { headers: { host: 'portal.test', origin: 'https://other.test' } })).statusCode, 403);
  assert.equal((await fixture().call({}, { httpMethod: 'GET' })).statusCode, 405);
});

test('un fallo al guardar no autoriza a mostrar el aviso', async () => {
  const response = await fixture({ databaseError: true }).call();
  assert.equal(response.statusCode, 500);
  assert.notEqual(JSON.parse(response.body).show, true);
});
