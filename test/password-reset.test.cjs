const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function loadHandler(name, mocks) {
  const filename = path.resolve(`backend/functions/${name}.js`);
  const realRequire = createRequire(filename);
  const exports = {};
  const module = { exports };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    exports, module, require: (id) => mocks[id] || realRequire(id), process, Buffer,
    console: { error() {} }, Date, encodeURIComponent,
  }, { filename });
  return module.exports;
}

test('password reset token expires and becomes invalid after changing the password', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-password-reset-secret-with-enough-entropy';
  try {
    const auth = require('../backend/lib/auth');
    const firstHash = auth.hashPassword('initial-password');
    const token = auth.signPasswordResetToken({ id: 'user-1', password_hash: firstHash });
    const payload = auth.verifyPasswordResetToken(token);
    assert.equal(payload.uid, 'user-1');
    assert.equal(auth.isCurrentPasswordResetToken(payload, firstHash), true);
    assert.equal(auth.isCurrentPasswordResetToken(payload, auth.hashPassword('new-password')), false);
    assert.equal(auth.verifyPasswordResetToken(token + 'tampered'), null);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});

test('forgot password does not reveal whether an account exists', async () => {
  let emailCalls = 0;
  const { handler } = loadHandler('auth-forgot-password', {
    '../lib/supabase': { getSupabase: () => ({
      from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
    }) },
    '../lib/email': { sendEmail: async () => { emailCalls += 1; } },
  });
  const response = await handler({ httpMethod: 'POST', headers: {}, body: '{"email":"unknown@example.test"}' });
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).ok, true);
  assert.equal(emailCalls, 0);
});

test('reset link always returns to The Robin Plan and contains the signed token', () => {
  const previous = process.env.PUBLIC_BASE_URL;
  process.env.PUBLIC_BASE_URL = 'https://project-robin.com/therobinplan/';
  try {
    const { _test } = loadHandler('auth-forgot-password', {});
    assert.equal(
      _test.resetUrl({ headers: {} }, 'signed.token'),
      'https://project-robin.com/therobinplan/?reset_token=signed.token'
    );
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = previous;
  }
});

test('a valid reset request replaces the hash without exposing the password', async () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-password-reset-secret-with-enough-entropy';
  try {
    const auth = require('../backend/lib/auth');
    const oldHash = auth.hashPassword('initial-password');
    const user = { id: 'user-1', role: 'subscriber', password_hash: oldHash };
    const token = auth.signPasswordResetToken(user);
    let savedHash = '';
    const database = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: user, error: null }) }) }),
        update: (values) => {
          savedHash = values.password_hash;
          return { eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: user.id }, error: null }) }) }) }) };
        },
      }),
    };
    const { handler } = loadHandler('auth-reset-password', {
      '../lib/supabase': { getSupabase: () => database },
    });
    const response = await handler({
      httpMethod: 'POST', headers: {},
      body: JSON.stringify({ token, password: 'a-new-secure-password' }),
    });
    assert.equal(response.statusCode, 200);
    assert.equal(auth.verifyPassword('a-new-secure-password', savedHash), true);
    assert.equal(savedHash.includes('a-new-secure-password'), false);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});
