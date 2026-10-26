const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

test('envía un enlace al correo del alumno y lo invalida después de usarlo', async () => {
  process.env.JWT_SECRET = 'test-only-password-reset-flow-secret';
  const { hashPassword, verifyPassword } = require('../lib/auth');
  const user = {
    id: 'student-test', email: 'alumna@example.org', username: 'alumna', role: 'client',
    password_hash: hashPassword('ClaveDePrueba2027#'),
  };
  let email = null;
  const sb = {
    from(table) {
      assert.equal(table, 'users');
      const query = {
        patch: null,
        select() {
          if (!this.patch) return this;
          const current = user.password_hash;
          if (this.expectedHash !== current) return Promise.resolve({ data: [], error: null });
          Object.assign(user, this.patch);
          return Promise.resolve({ data: [{ id: user.id }], error: null });
        },
        eq(key, value) { if (key === 'password_hash') this.expectedHash = value; return this; },
        limit() { return Promise.resolve({ data: [user], error: null }); },
        maybeSingle() { return Promise.resolve({ data: user, error: null }); },
        update(patch) { this.patch = patch; return this; },
      };
      return query;
    },
  };
  const requestPath = require.resolve('../netlify/functions/auth-reset-request');
  const confirmPath = require.resolve('../netlify/functions/auth-reset-confirm');
  const mocks = {
    '../../lib/supabase': { getSupabase: () => sb },
    '../../lib/email': { sendEmail: async (value) => { email = value; return { sent: true }; } },
    '../../lib/operational-config': { publicBaseUrl: () => 'https://project-robin.com' },
  };
  const originals = new Map();
  for (const [name, exports] of Object.entries(mocks)) {
    const file = require.resolve(name, { paths: [path.dirname(requestPath)] });
    originals.set(file, require.cache[file]);
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
  }
  delete require.cache[requestPath];
  delete require.cache[confirmPath];
  try {
    const request = require(requestPath).handler;
    const confirm = require(confirmPath).handler;
    const headers = { host: 'project-robin.com', origin: 'https://project-robin.com' };
    const requested = await request({ httpMethod: 'POST', headers, body: JSON.stringify({ identifier: user.email }) });
    assert.equal(requested.statusCode, 200);
    assert.equal(email.to, user.email);
    const link = email.text.match(/https:\/\/[^\s]+/)[0];
    const token = new URLSearchParams(new URL(link).hash.slice(1)).get('reset');
    assert.ok(token);
    const payload = JSON.stringify({ token, new_password: 'ClaveNueva2027!' });
    const changed = await confirm({ httpMethod: 'POST', headers, body: payload });
    assert.equal(changed.statusCode, 200);
    assert.equal(verifyPassword('ClaveNueva2027!', user.password_hash), true);
    assert.equal(user.password_hash, 'plain:v1:ClaveNueva2027!');
    const replay = await confirm({ httpMethod: 'POST', headers, body: payload });
    assert.equal(replay.statusCode, 400);
  } finally {
    delete require.cache[requestPath];
    delete require.cache[confirmPath];
    for (const [file, original] of originals) {
      if (original) require.cache[file] = original;
      else delete require.cache[file];
    }
  }
});
