/**
 * Auth helpers para Netlify Functions.
 * - bcrypt para hashing de password
 * - JWT para sesion (cookie httpOnly)
 * - sin estado en servidor (todo en la cookie)
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createHmac } = require('node:crypto');
const { parse: parseCookies, serialize: serializeCookie } = require('cookie');
const { createCookieHelpers } = require('../../../packages/auth/cookies.cjs');
const sharedCookies = createCookieHelpers({ parse: parseCookies, serialize: serializeCookie });

const COOKIE_NAME = 'robin_portal_session';
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 7; // 7 dias

function getJwtSecret(purpose) {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET no configurado');
  return purpose ? createHmac('sha256', s).update(`robin/${purpose}`).digest() : s;
}

function hashPassword(plain) {
  if (typeof plain !== 'string' || !plain || Buffer.byteLength(plain, 'utf8') > 72) {
    throw new TypeError('password must contain between 1 and 72 UTF-8 bytes');
  }
  return bcrypt.hashSync(plain, 12);
}
function verifyPassword(plain, hash) {
  if (typeof plain !== 'string' || !plain || Buffer.byteLength(plain, 'utf8') > 72) return false;
  if (typeof hash !== 'string' || !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash)) return false;
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
  getJwtSecret,
  hashPassword,
  verifyPassword,
  signSession,
  buildSessionCookie,
  readSessionFromEvent,
};
