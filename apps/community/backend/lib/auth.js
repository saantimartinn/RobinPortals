/**
 * Auth helpers para Netlify Functions.
 * - bcrypt para hashing de password
 * - JWT para sesion (cookie httpOnly)
 * - sin estado en servidor (todo en la cookie)
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { parse: parseCookies, serialize: serializeCookie } = require('cookie');
const { createCookieHelpers } = require('../../../../packages/auth/cookies.cjs');
const sharedCookies = createCookieHelpers({ parse: parseCookies, serialize: serializeCookie });

const COOKIE_NAME = 'robin_subscription_session';
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 7; // 7 dias

function getJwtSecret() {
  const s = process.env.COMMUNITY_JWT_SECRET;
  if (!s) throw new Error('COMMUNITY_JWT_SECRET no configurado');
  return s;
}

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 12);
}
function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function passwordResetVersion(passwordHash) {
  return crypto.createHash('sha256').update(String(passwordHash || '')).digest('base64url');
}

function signPasswordResetToken(user) {
  return jwt.sign(
    {
      uid: user.id,
      purpose: 'password_reset',
      password_version: passwordResetVersion(user.password_hash),
    },
    getJwtSecret(),
    { expiresIn: '30m' }
  );
}

function verifyPasswordResetToken(token) {
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (!payload.uid || payload.purpose !== 'password_reset' || !payload.password_version) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function isCurrentPasswordResetToken(payload, passwordHash) {
  if (!payload || !payload.password_version) return false;
  const actual = Buffer.from(passwordResetVersion(passwordHash));
  const expected = Buffer.from(String(payload.password_version));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function signSession(user) {
  const payload = { uid: user.id, lead_id: user.lead_id, username: user.username, role: user.role };
  if (user.auth_source) payload.auth_source = user.auth_source;
  return jwt.sign(
    payload,
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

function buildSessionCookie(token, { clear = false } = {}) {
  return sharedCookies.build(COOKIE_NAME, token, { clear, maxAge: COOKIE_MAX_AGE_S });
}

function clearApplicationSessionCookie() {
  return sharedCookies.build('robin_portal_session', '', { clear: true, maxAge: 0 });
}

function readSessionFromEvent(event) {
  const token = sharedCookies.read(event, COOKIE_NAME);
  if (!token) return null;
  try {
    const session = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    return session.uid
      && require('./principal').isSubscriberRole(session.role)
      && ['application_sso', 'application_admin'].includes(session.auth_source)
      ? session
      : null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  signPasswordResetToken,
  verifyPasswordResetToken,
  isCurrentPasswordResetToken,
  signSession,
  buildSessionCookie,
  clearApplicationSessionCookie,
  readSessionFromEvent,
};
