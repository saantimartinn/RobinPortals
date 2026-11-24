const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');

function loadHandler(filename, overrides) {
  const realRequire = createRequire(filename);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module,
    exports: module.exports,
    require: (id) => overrides[id] || realRequire(id),
    process,
    Buffer,
    console,
  }, { filename });
  return module.exports.handler;
}

for (const app of [
  { name: 'Portal', file: 'apps/portal/netlify/functions/auth-change-password.js', source: 'portal', prefix: '../../lib' },
  { name: 'Admin', file: 'apps/admin/netlify/functions/auth-change-password.js', source: 'admin', prefix: '../../lib' },
  { name: 'RobinJr', file: 'apps/robinjr/netlify/functions/auth-change-password.js', source: 'robinjr', prefix: '../../lib', identityModule: '../../lib/application-identity' },
  { name: 'Community', file: 'apps/community/backend/functions/auth-change-password.js', source: 'community', prefix: '../lib', identityModule: '../lib/application-permissions' },
]) {
  test(`${app.name} changes the shared-login account and rejects a different source`, async () => {
    const filename = path.resolve(__dirname, '../..', app.file);
    const auth = require(path.resolve(__dirname, '../..', app.file.includes('community') ? 'apps/community/backend/lib/auth.js' : `apps/${app.source}/lib/auth.js`));
    const oldHash = auth.hashPassword('old-password');
    let identity = { auth_source: 'external_client', external_source: app.source, external_identity_id: 'own-user' };
    let selectedId = null;
    let saved = null;
    const sb = {
      from: () => ({
        select: () => ({ eq: (_field, id) => ({ single: async () => { selectedId = id; return { data: { id, password_hash: oldHash }, error: null }; } }) }),
        update: (values) => ({ eq: async () => { saved = values.password_hash; return { error: null }; } }),
      }),
    };
    const handler = loadHandler(filename, {
      [`${app.prefix}/auth`]: { ...auth, readSessionFromEvent: () => app.identityModule ? null : { uid: 'own-user' } },
      [`${app.prefix}/supabase`]: { getSupabase: () => sb },
      ...(app.identityModule ? { [app.identityModule]: { readApplicationIdentity: async () => identity } } : {}),
    });
    const event = { httpMethod: 'POST', headers: { cookie: 'robin_portal_session=test' }, body: JSON.stringify({ current_password: 'old-password', new_password: 'new-password-2027' }) };
    const changed = await handler(event);
    assert.equal(changed.statusCode, 200);
    assert.equal(selectedId, 'own-user');
    assert.match(saved, /^\$2[aby]\$12\$/);
    assert.equal(auth.verifyPassword('new-password-2027', saved), true);
    assert.equal(auth.verifyPassword('old-password', saved), false);

    saved = null;
    const invalid = await handler({ ...event, body: JSON.stringify({ current_password: 'wrong-password', new_password: 'new-password-2027' }) });
    assert.equal(invalid.statusCode, 401);
    assert.equal(saved, null);

    if (!app.identityModule) return;

    identity = { ...identity, external_source: 'other' };
    selectedId = null;
    saved = null;
    const rejected = await handler(event);
    assert.equal(rejected.statusCode, 401);
    assert.equal(selectedId, null);
    assert.equal(saved, null);
  });
}

test('Community signup rejects oversized passwords before any database access', async () => {
  const filename = path.resolve(__dirname, '../../apps/community/backend/functions/subscriber-signup.js');
  const handler = loadHandler(filename, {
    '../lib/supabase': { getSupabase: () => { throw new Error('must not access database'); } },
  });
  const response = await handler({
    httpMethod: 'POST', headers: { host: 'project-robin.com', origin: 'https://project-robin.com' },
    body: JSON.stringify({ name: 'Synthetic User', email: 'user@example.invalid', password: 'é'.repeat(37) }),
  });
  assert.equal(response.statusCode, 400);
  assert.equal(JSON.parse(response.body).error, 'weak_password');
});
