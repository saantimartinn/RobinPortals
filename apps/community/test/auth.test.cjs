// Automated checks for auth test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const auth = require('../backend/lib/auth');
const { principalTable, subscriberDisplayName } = require('../backend/lib/principal');
process.env.COMMUNITY_JWT_SECRET = 'test-only-not-a-production-secret-123456789';
const event = token => ({ headers: { cookie: `${auth.COOKIE_NAME}=${token}` } });
test('subscriber sessions round trip; application roles are rejected', () => {
  for (const role of ['subscriber','subscriber_admin']) {
    const token = auth.signSession({ id:'user-1', username:'test', role, auth_source:'application_sso' });
    assert.equal(auth.readSessionFromEvent(event(token)).role, role);
    assert.equal(principalTable(role), 'subscribers');
  }
  assert.equal(auth.readSessionFromEvent(event(auth.signSession({ id:'user-1',role:'admin',auth_source:'application_sso' }))), null);
  assert.equal(auth.readSessionFromEvent(event(auth.signSession({ id:'user-1',role:'subscriber' }))), null);
  assert.throws(()=>principalTable('admin'), /unsupported_role/);
});
test('subscriber display names retain the existing name and fallback order', () => {
  assert.equal(subscriberDisplayName({ nombre: 'Ana', apellidos: 'Robin', email: 'ana@example.test' }), 'Ana Robin');
  assert.equal(subscriberDisplayName({ email: 'ana@example.test', username: 'ana' }), 'ana@example.test');
  assert.equal(subscriberDisplayName({ username: 'ana' }), 'ana');
  assert.equal(subscriberDisplayName({}), 'Robin');
});
test('tampered, expired and missing sessions fail closed', () => {
  assert.equal(auth.readSessionFromEvent(event('invalid')), null);
  assert.equal(auth.readSessionFromEvent({headers:{}}), null);
  assert.equal(auth.readSessionFromEvent(event(jwt.sign({uid:'1',role:'subscriber'},process.env.COMMUNITY_JWT_SECRET,{expiresIn:-1}))),null);
});
test('session cookie remains HttpOnly, Secure and SameSite=Lax', () => {
  const cookie=auth.buildSessionCookie('test');
  for(const attribute of ['HttpOnly','Secure','SameSite=Lax','Path=/']) assert.ok(cookie.includes(attribute));
  assert.match(auth.buildSessionCookie('',{clear:true}),/Max-Age=0/);
});
test('passwords hash and verify without plaintext storage', () => {
  const hash=auth.hashPassword('unique-test-password');
  assert.notEqual(hash,'unique-test-password');
  assert.equal(auth.verifyPassword('unique-test-password',hash),true);
  assert.equal(auth.verifyPassword('wrong',hash),false);
});
