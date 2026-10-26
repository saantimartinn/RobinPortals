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
    console,
  }, { filename });
  return module.exports.handler;
}

for (const app of [
  { name: 'RobinJr', file: 'apps/robinjr/netlify/functions/auth-change-password.js', source: 'robinjr', prefix: '../../lib', identityModule: '../../lib/application-identity' },
  { name: 'Community', file: 'apps/community/backend/functions/auth-change-password.js', source: 'community', prefix: '../lib', identityModule: '../lib/application-permissions' },
]) {
  test(`${app.name} changes the shared-login account and rejects a different source`, async () => {
    const filename = path.resolve(__dirname, '../..', app.file);
    let identity = { auth_source: 'external_client', external_source: app.source, external_identity_id: 'own-user' };
    let selectedId = null;
    let saved = null;
    const sb = {
      from: () => ({
        select: () => ({ eq: (_field, id) => ({ single: async () => { selectedId = id; return { data: { id, password_hash: 'plain:v1:old-password' }, error: null }; } }) }),
        update: (values) => ({ eq: async () => { saved = values.password_hash; return { error: null }; } }),
      }),
    };
    const handler = loadHandler(filename, {
      [`${app.prefix}/auth`]: { readSessionFromEvent: () => null, verifyPassword: (password, stored) => stored === `plain:v1:${password}` },
      [`${app.prefix}/supabase`]: { getSupabase: () => sb },
      [app.identityModule]: { readApplicationIdentity: async () => identity },
    });
    const event = { httpMethod: 'POST', headers: { cookie: 'robin_portal_session=test' }, body: JSON.stringify({ current_password: 'old-password', new_password: 'new-password-2027' }) };
    const changed = await handler(event);
    assert.equal(changed.statusCode, 200);
    assert.equal(selectedId, 'own-user');
    assert.equal(saved, 'plain:v1:new-password-2027');

    identity = { ...identity, external_source: 'other' };
    selectedId = null;
    saved = null;
    const rejected = await handler(event);
    assert.equal(rejected.statusCode, 401);
    assert.equal(selectedId, null);
    assert.equal(saved, null);
  });
}
