/**
 * Auth helpers para Netlify Functions.
 * - bcrypt para hashing de password
 * - JWT para sesion (cookie httpOnly)
 * - sin estado en servidor (todo en la cookie)
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parse: parseCookies, serialize: serializeCookie } = require('cookie');
const { createCookieHelpers } = require('../../../packages/auth/cookies.cjs');
const { verifyStoredPlaintextPassword } = require('../../../packages/auth/password-storage.cjs');
const sharedCookies = createCookieHelpers({ parse: parseCookies, serialize: serializeCookie });

const COOKIE_NAME = 'robin_portal_session';
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 7; // 7 dias

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET no configurado');
  return s;
}

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 12);
}
function verifyPassword(plain, hash) {
  const plainResult = verifyStoredPlaintextPassword(plain, hash);
  if (plainResult !== null) return plainResult;
  return bcrypt.compareSync(plain, hash);
}

function signSession(user) {
  return jwt.sign(
    { uid: user.id, lead_id: user.lead_id, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

function buildSessionCookie(token, { clear = false } = {}) {
  return sharedCookies.build(COOKIE_NAME, token, { clear, maxAge: COOKIE_MAX_AGE_S });
}

function readSessionFromEvent(event) {
  const token = sharedCookies.read(event, COOKIE_NAME);
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (e) {
    return null;
  }
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  signSession,
  buildSessionCookie,
  readSessionFromEvent,
};
