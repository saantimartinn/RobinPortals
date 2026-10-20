// Automated checks for auth session test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSessionCookie, readSessionFromEvent, signSession } = require('../lib/auth');

test('firma y recupera una sesión desde la cookie segura', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-secret-with-enough-entropy';
  try {
    const token = signSession({ id: 'u1', lead_id: 'L1', username: 'user', role: 'alumno' });
    const cookie = buildSessionCookie(token);
    const session = readSessionFromEvent({ headers: { cookie } });
    assert.equal(session.uid, 'u1');
    assert.equal(session.role, 'alumno');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});

test('rechaza cookies manipuladas', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-secret-with-enough-entropy';
  try {
    assert.equal(readSessionFromEvent({ headers: { cookie: 'robin_session=invalid' } }), null);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});
